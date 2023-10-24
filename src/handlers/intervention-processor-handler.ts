import { Context, SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import logger from '../commons/logger';
import { MetricNames } from '../data-types/constants';
import { logAndPublishMetric } from '../commons/metrics';
import { InterventionRequest } from '../data-types/interfaces';
import { validateInterventionRequest } from '../services/validate-intervention-request';

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
