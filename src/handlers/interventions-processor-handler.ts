import { Context, SQSBatchItemFailure, SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';
import logger from '../commons/logger';
import {
  EventsEnum,
  LOGS_PREFIX_SENSITIVE_INFO,
  MetricNames,
  TICF_ACCOUNT_INTERVENTION,
} from '../data-types/constants';
import { logAndPublishMetric } from '../commons/metrics';
import { validateEvent, validateInterventionEvent } from '../services/validate-event';
import { AccountStateEngine } from '../services/account-states/account-state-engine';
import { DynamoDatabaseService } from '../services/dynamo-database-service';
import { AppConfigService } from '../services/app-config-service';
import { StateTransitionError, TooManyRecordsError, ValidationError } from '../data-types/errors';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { TxMAIngressEvent } from '../data-types/interfaces';
import { buildPartialUpdateAccountStateCommand } from '../commons/build-partial-update-state-command';

const appConfig = AppConfigService.getInstance();
const service = new DynamoDatabaseService(appConfig.tableName);
const accountStateEngine = AccountStateEngine.getInstance();
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
    const recordBody: TxMAIngressEvent = JSON.parse(record.body);
    validateEvent(recordBody);
    const eventTimestampInMs = recordBody.event_timestamp_ms ?? recordBody.timestamp * 1000;
    if (isTimestampNotInFuture(eventTimestampInMs)) {
      const intervention = getInterventionName(recordBody);
      logger.debug('identified event: ' + intervention);
      const itemFromDB = await service.retrieveRecordsByUserId(recordBody.user.user_id);
      if (itemFromDB?.isAccountDeleted === true) {
        logger.warn(`${LOGS_PREFIX_SENSITIVE_INFO} user ${recordBody.user.user_id} account has been deleted.`);
        logAndPublishMetric(MetricNames.ACCOUNT_IS_MARKED_AS_DELETED);
      } else if (isEventIsAfterLastEvent(eventTimestampInMs, itemFromDB?.sentAt, itemFromDB?.appliedAt)) {
        logger.debug('retrieved item from DB ' + JSON.stringify(itemFromDB));
        const statusResult = accountStateEngine.applyEventTransition(intervention, itemFromDB);
        const partialCommandInput = buildPartialUpdateAccountStateCommand(
          statusResult.newState,
          intervention,
          eventTimestampInMs,
          statusResult.interventionName,
        );
        logger.debug('processed requested event, sending update request to dynamo db');
        await service.updateUserStatus(recordBody.user.user_id, partialCommandInput);
      } else {
        logger.warn('Event received predates last applied event for this user.');
        logAndPublishMetric(MetricNames.INTERVENTION_EVENT_STALE);
      }
    } else {
      itemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  } catch (error) {
    if (error instanceof StateTransitionError) {
      logger.warn('StateTransitionError caught, message will not be retried.');
    } else if (error instanceof ValidationError) {
      logger.warn('ValidationError caught, message will not be retried.');
    } else if (error instanceof TooManyRecordsError) {
      logger.warn('TooManyRecordsError caught, message will not be retried.');
    } else {
      logger.debug(JSON.stringify(error));
      itemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }
}

/**
 * A function to check if timestamp of the event is in the future.
 *
 * @param recordTimeStampInMs - timestamp in ms from record
 */
function isTimestampNotInFuture(recordTimeStampInMs: number): boolean {
  const now = getCurrentTimestamp().milliseconds;
  if (now < recordTimeStampInMs) {
    logger.debug(`Timestamp is in the future (sec): ${recordTimeStampInMs}.`);
    logAndPublishMetric(MetricNames.INTERVENTION_IGNORED_IN_FUTURE);
    return false;
  }
  return true;
}

/**
 * A function to compute the event name,
 *
 * @param recordBody - the parsed body of the sqs record
 */
function getInterventionName(recordBody: TxMAIngressEvent): EventsEnum {
  logger.debug('event is valid, starting processing');
  if (recordBody.event_name === TICF_ACCOUNT_INTERVENTION) {
    validateInterventionEvent(recordBody);
    const interventionCode = Number.parseInt(recordBody.extension!.intervention.intervention_code);
    return accountStateEngine.getInterventionEnumFromCode(interventionCode);
  }
  return recordBody.event_name as EventsEnum;
}

function isEventIsAfterLastEvent(eventTimeStamp: number, sentAt?: number, appliedAt?: number) {
  const latestIntervention = sentAt ?? appliedAt ?? 0;
  return eventTimeStamp > latestIntervention;
}
