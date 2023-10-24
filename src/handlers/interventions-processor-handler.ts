import { Context, SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import logger from '../commons/logger';
import {
  AccountStateEventEnum,
  MetricNames,
  TCIFAccountInterventionMapping,
  TICF_ACCOUNT_INTERVENTION,
} from '../data-types/constants';
import { logAndPublishMetric } from '../commons/metrics';
import { InterventionRequest } from '../data-types/interfaces';
import { validateInterventionRequest } from '../services/validate-intervention-request';
import { AccountStateEvents } from '../services/account-states/account-state-events';

// const appConfig = AppConfigService.getInstance();

export const handler = async (event: SQSEvent, context: Context): Promise<SQSBatchResponse> => {
  logger.addContext(context);

  if (event.Records.length === 0) {
    logger.warn('Received no records.');
    logAndPublishMetric(MetricNames.INTERVENTION_EVENT_INVALID);
    return {
      batchItemFailures: [],
    };
  }

  const itemFailures: SQSBatchItemFailure[] = [];
  for (const record of event.Records) {
    try {
      const recordBody: InterventionRequest = JSON.parse(record.body);
      if (!validateInterventionRequest(recordBody)) {
        logger.warn('Invalid intervention request.');
        logAndPublishMetric(MetricNames.INTERVENTION_INVALID);
      }
      const now = Math.floor(Date.now() / 1000);
      if (now < recordBody.timestamp) {
        logger.warn(`Timestamp is in the future (sec): ${recordBody.timestamp}`);
        logAndPublishMetric(MetricNames.INTERVENTION_IGNORED_IN_FUTURE);
        itemFailures.push({
          itemIdentifier: record.messageId,
        });
      } else {
        let intervention: string = AccountStateEventEnum.recordBody.event_name;
        if (recordBody.event_name === TICF_ACCOUNT_INTERVENTION) {
          intervention = TCIFAccountInterventionMapping[recordBody.extension.intervention.intervention_code];
        }
        const x = AccountStateEvents.applyEventTransition(intervention, {});
      }
    } catch {
      itemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  return {
    batchItemFailures: itemFailures,
  };
};
