import { randomUUID } from 'node:crypto';
import { HistoryStringBuilder } from '../commons/history-string-builder';
import logger from '../commons/logger';
import { addMetric } from '../commons/metrics';
import { HistoryObject, V2HistoryResponse } from '../data-types/api-schemas-v2';
import { isCode, MetricNames } from '../data-types/constants';
import { HistoryObject as HistoryLine } from '../data-types/interfaces';
import { AccountStatusService } from '../tables/account-status';
import { InterventionEventsService } from '../tables/intervention-events';
import notEmpty from '../utils/not-empty';
import { transitionConfig } from './account-states/config';
import { config } from './persist-intervention-events';

export class HistoryService {
  constructor(
    readonly accountStatusService: AccountStatusService,
    readonly interventionEventsService: InterventionEventsService,
  ) {}

  async fetchHistory(accountId: string): Promise<V2HistoryResponse> {
    const accountStatusHistory = await this.fetchAccountStatus(accountId);

    const interventionEvents = await this.fetchInterventionEvents(accountId);

    return {
      history: this.deduplicateEvents(accountStatusHistory, interventionEvents),
    };
  }

  protected async fetchAccountStatus(accountId: string): Promise<HistoryObject[]> {
    const response = await this.accountStatusService.getAccountStateInformation(accountId);
    if (!response) {
      logger.info('Query matched no records in DynamoDB.');
      addMetric(MetricNames.ACCOUNT_NOT_FOUND);
      return [];
    }

    return this.constructHistoryObject(response.history);
  }

  protected constructHistoryObject(input: string[]): HistoryObject[] {
    const historyStringBuilder = new HistoryStringBuilder();

    const historyLines = input
      .map((historyString) => {
        try {
          return historyStringBuilder.getHistoryObject(historyString);
        } catch (error) {
          logger.error('History string is malformed.', { error });
          addMetric(MetricNames.INVALID_HISTORY_STRING);
        }
      })
      .filter(notEmpty);

    return historyLines.reduce<HistoryObject[]>(
      (result, historyLine) => [...result, ...this.mapHistoryObjectToInterventionEvents(historyLine)],
      [],
    );
  }

  protected mapHistoryObjectToInterventionEvents(input: HistoryLine): HistoryObject[] {
    if (!isCode(input.code)) throw new Error('Code not code');

    const eventEdge = transitionConfig.edges[input.code];

    const stateChanges = config[eventEdge.name];

    const transactionId = randomUUID();

    return stateChanges.map((stateChange) => ({
      interventionName: stateChange.interventionName,
      interventionState: stateChange.interventionState,
      interventionCode: input.code,
      interventionReason: input.reason,
      sentAt: Number(new Date(input.sentAt)),
      componentId: input.component,
      originatingComponent: input.originatingComponent,
      requesterId: input.requesterId,
      originatorReferenceId: input.originatorReferenceId,
      transactionId,
    }));
  }

  protected async fetchInterventionEvents(accountId: string) {
    return await this.interventionEventsService.fetchEventsForAccount(accountId);
  }

  protected deduplicateEvents(
    accountStatusEvents: HistoryObject[],
    interventionEvents: HistoryObject[],
  ): HistoryObject[] {
    const transactionIdsToRemove = new Set(
      accountStatusEvents
        .filter((event) =>
          interventionEvents.some(
            (interventionEvent) =>
              interventionEvent.interventionName === event.interventionName &&
              interventionEvent.interventionState === event.interventionState &&
              Math.abs(interventionEvent.sentAt - event.sentAt) < 10,
          ),
        )
        .map((event) => event.transactionId),
    );

    const remainingAccountStatusEvents = accountStatusEvents.filter(
      (event) => !transactionIdsToRemove.has(event.transactionId),
    );

    return [...remainingAccountStatusEvents, ...interventionEvents];
  }
}
