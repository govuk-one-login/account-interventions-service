import { Context, SQSBatchItemFailure, SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';
import logger from '../commons/logger';
import { EventsEnum, MetricNames, TICF_ACCOUNT_INTERVENTION } from '../data-types/constants';
import { logAndPublishMetric } from '../commons/metrics';
import { TxMAEvent } from '../data-types/interfaces';
import { validateEvent, validateInterventionEvent } from '../services/validate-event';
import { AccountStateEngine } from '../services/account-states/account-state-engine';
import { DynamoDatabaseService } from '../services/dynamo-database-service';
import { AppConfigService } from '../services/app-config-service';
import { StateTransitionError, TooManyRecordsError, ValidationError } from '../data-types/errors';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';

const appConfig = AppConfigService.getInstance();
const service = new DynamoDatabaseService(appConfig.tableName);

/**
 * A function for receiving and processing an intervention event.
 *
 * @param event - SQS event
 * @param context - the {@link Context} object containing information about the runtime environment of this Lambda function
 */
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
    await processSQSRecord(itemFailures, record);
  }
  logger.debug('returning items that failed processing: ' + JSON.stringify(itemFailures));
  return {
    batchItemFailures: itemFailures,
  };
};

/**
 * A function to process the SQS record, retrieve the corresponding record from DynamoDB and update the record accordingly.
 *
 * @param itemFailures - the array of items that should be retried
 * @param record - sqs record
 */
async function processSQSRecord(itemFailures: SQSBatchItemFailure[], record: SQSRecord) {
  try {
    const recordBody: TxMAEvent = JSON.parse(record.body);
    validateEvent(recordBody);
    if (isTimestampNotInFuture(recordBody, itemFailures, record.messageId)) {
      const intervention = getInterventionName(recordBody);
      logger.debug('identified event: ' + intervention);
      const itemFromDB = await service.retrieveRecordsByUserId(recordBody.user.user_id);
      logger.debug('retrieved item from DB ' + JSON.stringify(itemFromDB));
      const statusResult = AccountStateEngine.applyEventTransition(intervention, itemFromDB);
      logger.debug('processed requested event, sending update request to dynamo db');
      await service.updateUserStatus(recordBody.user.user_id, statusResult);
    }
  } catch (error) {
    if (error instanceof StateTransitionError) {
      logger.warn('StateTransitionError caught, message will not be retried');
    } else if (error instanceof ValidationError) {
      logger.warn('ValidationError caught, message will not be retried');
    } else if (error instanceof TooManyRecordsError) {
      logger.warn('TooManyRecordsError caught, message will not be retried');
    } else {
      itemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }
}

/**
 * A function to check if timestamp of the event is in the future.
 *
 * @param recordBody - the parsed body of the sqs record
 * @param itemFailures - the array of items that should be retried
 * @param messageId - the messageId of the sqs record
 */
function isTimestampNotInFuture(
  recordBody: TxMAEvent,
  itemFailures: SQSBatchItemFailure[],
  messageId: string,
): boolean {
  const now = getCurrentTimestamp().milliseconds;
  if (now < recordBody.timestamp) {
    logger.debug(`Timestamp is in the future (sec): ${recordBody.timestamp}`);
    logAndPublishMetric(MetricNames.INTERVENTION_IGNORED_IN_FUTURE);
    itemFailures.push({
      itemIdentifier: messageId,
    });
    return false;
  }
  return true;
}

/**
 * A function to compute the event name,
 *
 * @param recordBody - the parsed body of the sqs record
 */
function getInterventionName(recordBody: TxMAEvent): EventsEnum {
  logger.debug('event is valid, starting processing');
  if (recordBody.event_name === TICF_ACCOUNT_INTERVENTION) {
    validateInterventionEvent(recordBody);
    const interventionCode = Number.parseInt(recordBody.extension!.intervention.intervention_code);
    return AccountStateEngine.getInterventionEnumFromCode(interventionCode);
  }
  return recordBody.event_name as EventsEnum;
}
