import { randomUUID } from 'node:crypto';
import { HistoryStringBuilder } from '../commons/history-string-builder';
import logger from '../commons/logger';
import { addMetric } from '../commons/metrics';
import { HistoryLine, V2HistoryResponse } from '../data-types/api-schemas-v2';
import { MetricNames } from '../data-types/constants';
import { HistoryObject } from '../data-types/interfaces';
import { AccountStatusService } from '../tables/account-status';
import { InterventionEventsService } from '../tables/intervention-events';
import notEmpty from '../utils/not-empty';
import { transitionConfig } from './account-states/config';
import { config } from './persist-intervention-events';

export class HistoryService {
  constructor(
    readonly accountStatusService: AccountStatusService,
    readonly interventionEventsService: InterventionEventsService,
    readonly deduplicate: (
      accountStatusHistory: HistoryLine[],
      interventionEvents: HistoryLine[],
    ) => HistoryLine[] = deduplicateEvents,
  ) {}

  async fetchHistory(accountId: string): Promise<V2HistoryResponse> {
    const accountStatusHistory = await this.fetchAccountStatus(accountId);

    const interventionEvents = await this.fetchInterventionEvents(accountId);

    return {
      lines: this.deduplicate(accountStatusHistory, interventionEvents),
    };
  }

  private async fetchAccountStatus(accountId: string): Promise<HistoryLine[]> {
    const response = await this.accountStatusService.getAccountStateInformation(accountId);
    if (!response) {
      logger.info('Query matched no records in DynamoDB.');
      addMetric(MetricNames.ACCOUNT_NOT_FOUND);
      return [];
    }

    return this.constructHistoryObject(response.history);
  }

  private constructHistoryObject(input: string[]): HistoryLine[] {
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

    return historyLines.reduce<HistoryLine[]>(
      (result, historyLine) => [...result, ...this.mapHistoryObjectToInterventionEvents(historyLine)],
      [],
    );
  }

  private mapHistoryObjectToInterventionEvents(input: HistoryObject): HistoryLine[] {
    const eventEdge = transitionConfig.edges[input.code];

    const stateChanges = config[eventEdge.name];

    const tagId = randomUUID();

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
      tagId,
    }));
  }

  private async fetchInterventionEvents(accountId: string) {
    const interventionEvents = await this.interventionEventsService.fetchEventsForAccount(accountId);

    return interventionEvents.map((event) => ({ ...event, tagId: event.transactionId ?? randomUUID() }));
  }
}

// Deduplicate data from v1 and v2 history
export function deduplicateEvents<T extends HistoryIdentifier>(accountStatusEvents: T[], interventionEvents: T[]): T[] {
  const transactionIdsToRemove = new Set(
    accountStatusEvents
      .filter((event) =>
        interventionEvents.some(
          (interventionEvent) =>
            interventionEvent.interventionName === event.interventionName &&
            interventionEvent.interventionState === event.interventionState &&
            interventionEvent.sentAt === event.sentAt,
        ),
      )
      .map((event) => event.transactionId),
  );

  const remainingAccountStatusEvents = accountStatusEvents.filter(
    (event) => !transactionIdsToRemove.has(event.transactionId),
  );

  return [...remainingAccountStatusEvents, ...interventionEvents];
}

export interface HistoryIdentifier {
  interventionName: string;
  interventionState: string;
  sentAt: number;
  transactionId?: string | undefined;
}
