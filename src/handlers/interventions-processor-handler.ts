import { Context, SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import logger from '../commons/logger';
import { AccountStateEventEnum, MetricNames, TICF_ACCOUNT_INTERVENTION } from '../data-types/constants';
import { logAndPublishMetric } from '../commons/metrics';
import { TxMAEvent } from '../data-types/interfaces';
import { validateEvent, validateInterventionEvent } from '../services/validate-event';
import { AccountStateEvents } from '../services/account-states/account-state-events';
import { DynamoDbService as DynamoDatabaseService } from '../services/dynamo-db-service';
import { AppConfigService } from '../services/app-config-service';
import { StateTransitionErrorIgnored } from '../data-types/errors';

const appConfig = AppConfigService.getInstance();
const service = new DynamoDatabaseService(appConfig.tableName);

export const handler = async (event: SQSEvent, context: Context): Promise<SQSBatchResponse> => {
  logger.addContext(context);

  if (event.Records.length === 0) {
    logger.debug('Received no records.');
    logAndPublishMetric(MetricNames.INTERVENTION_EVENT_INVALID);
    return {
      batchItemFailures: [],
    };
  }

  const itemFailures: SQSBatchItemFailure[] = [];
  for (const record of event.Records) {
    try {
      const recordBody: TxMAEvent = JSON.parse(record.body);
      if (!validateEvent(recordBody)) {
        logger.debug('Invalid intervention request.');
        logAndPublishMetric(MetricNames.INTERVENTION_INVALID);
        continue;
      }
      const now = Math.floor(Date.now() / 1000);
      if (now < recordBody.timestamp) {
        logger.debug(`Timestamp is in the future (sec): ${recordBody.timestamp}`);
        logAndPublishMetric(MetricNames.INTERVENTION_IGNORED_IN_FUTURE);
        itemFailures.push({
          itemIdentifier: record.messageId,
        });
      } else {
        let intervention: AccountStateEventEnum;
        logger.debug('event is valid, starting processing');
        if (recordBody.event_name === TICF_ACCOUNT_INTERVENTION) {
          if (!validateInterventionEvent(recordBody)) continue;
          intervention = AccountStateEvents.getInterventionEnumFromCode(
            recordBody.extension!.intervention.intervention_code,
          );
        } else {
          intervention = recordBody.event_name as AccountStateEventEnum;
        }
        logger.debug('identified event: ' + intervention);
        const itemFromDB = await service.retrieveRecordsByUserId(recordBody.user.user_id);
        logger.debug('retrieved item from DB ' + JSON.stringify(itemFromDB));
        //THIS COULD THROW and shouldn't be retried
        const statusResult = AccountStateEvents.applyEventTransition(intervention, itemFromDB);
        logger.debug('processed requested event, sending update request to dynamo db');
        await service.updateUserStatus(recordBody.user.user_id, statusResult);
      }
    } catch (error) {
      if (error instanceof StateTransitionErrorIgnored) {
        logger.warn('StateTransitionError caught, message will not be retried');
        continue;
      }
      itemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }
  logger.debug('returning items that failed processing: ' + JSON.stringify(itemFailures));
  return {
    batchItemFailures: itemFailures,
  };
};
