import { Context, SQSBatchItemFailure, SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import {
  EventsEnum,
  LOGS_PREFIX_SENSITIVE_INFO,
  MetricNames,
  noMetadata,
  TICF_ACCOUNT_INTERVENTION,
} from '../data-types/constants';
import { DynamoDBStateResult, StateDetails, TxMAIngressEvent } from '../data-types/interfaces';
import { StateTransitionError, TooManyRecordsError, ValidationError } from '../data-types/errors';
import {
  validateEventAgainstSchema,
  validateEventIsNotInFuture,
  validateEventIsNotStale,
  validateInterventionEvent,
  validateLevelOfConfidence,
} from '../services/validate-event';
import { AppConfigService } from '../services/app-config-service';
import { DynamoDatabaseService } from '../services/dynamo-database-service';
import { AccountStateEngine } from '../services/account-states/account-state-engine';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { sendAuditEvent } from '../services/send-audit-events';
import { buildPartialUpdateAccountStateCommand } from '../commons/build-partial-update-state-command';
import { updateAccountStateCountMetric } from '../commons/update-account-state-metrics';

const appConfig = AppConfigService.getInstance();
const service = new DynamoDatabaseService(appConfig.tableName);
const accountStateEngine = AccountStateEngine.getInstance();

/**
 * Main handler method for Intervention Processor Lambda
 * It iterates over the messages polled from the queue, it processes each record, and returns the list of items that failed processing to be retried
 * @param event - SQSEvent containing the intervention event
 * @param context - context object
 * @returns - Promise of SQS Partial Batch Response
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
  const promiseArray = event.Records.map((record: SQSRecord) => {
    const outerSQSMessageId = record.messageId;
    const parsedRecord = JSON.parse(record.body) as SQSRecord;
    return processSQSRecord(parsedRecord).catch(async (error) => {
      const errorIsRetryable = await handleError(error, record);
      if (errorIsRetryable) itemFailures.push({ itemIdentifier: outerSQSMessageId });
    });
  });
  await Promise.allSettled(promiseArray);
  logger.debug('returning items that failed processing: ' + JSON.stringify(itemFailures));
  return {
    batchItemFailures: itemFailures,
  };
};

/**
 * Main worker function. It receives an SQS record and processes it according to business logic
 * It validates the event, it retrieves user data from the database, it applies the intervention,
 * it updates the user record in the database, it sends a notification upon completion
 * @param record - SQS Record polled from the queue
 */
async function processSQSRecord(record: SQSRecord) {
  const currentTimestamp = getCurrentTimestamp();
  const recordBody: TxMAIngressEvent = JSON.parse(record.body);
  validateEventAgainstSchema(recordBody);
  const eventName = getEventName(recordBody);
  logger.debug(`${LOGS_PREFIX_SENSITIVE_INFO} Intervention received.`, { intervention: eventName });
  validateLevelOfConfidence(eventName, recordBody);
  await validateEventIsNotInFuture(eventName, recordBody);

  const userId = recordBody.user.user_id;
  const eventTimestampInMs = recordBody.event_timestamp_ms ?? recordBody.timestamp * 1000;

  logAndPublishMetric(
    MetricNames.EVENT_DELIVERY_LATENCY,
    noMetadata,
    currentTimestamp.milliseconds - eventTimestampInMs,
  );

  const itemFromDB = await service.getAccountStateInformation(userId);

  await validateAccountIsNotDeleted(eventName, userId, recordBody, itemFromDB);

  await validateEventIsNotStale(eventName, recordBody, itemFromDB);

  const currentAccountState: StateDetails = formCurrentAccountStateObject(itemFromDB);
  const statusResult = accountStateEngine.applyEventTransition(eventName, currentAccountState);
  const partialCommandInput = buildPartialUpdateAccountStateCommand(
    statusResult.newState,
    eventName,
    currentTimestamp.milliseconds,
    recordBody,
    statusResult.interventionName,
  );
  logger.debug('processed requested event, sending update request to dynamo db');
  await service.updateUserStatus(userId, partialCommandInput);
  updateAccountStateCountMetric(currentAccountState, statusResult.newState);
  logAndPublishMetric(MetricNames.INTERVENTION_EVENT_APPLIED, [], 1, { eventName: eventName.toString() });
  await sendAuditEvent('AIS_EVENT_TRANSITION_APPLIED', eventName, recordBody, currentTimestamp.milliseconds);
}

/**
 * Function to handle an error returned by the recording processing function
 * It logs appropriate messages and returns a message id if the Error type is not of a non-retryable type
 * @param error - error throw by the processing function
 * @param record - the record inside the message polled
 * @returns messageId - if the message should be retried
 */
async function handleError(error: unknown, record: SQSRecord) {
  if (error instanceof ValidationError)
    logger.warn('ValidationError caught, message will not be retried.', { errorMessage: error.message });
  else if (error instanceof TooManyRecordsError)
    logger.warn('Too many records were returned from the database. Message will not be retried', {
      errorMessage: error.message,
    });
  else if (error instanceof StateTransitionError) {
    logger.warn('StateTransitionError caught, message will not be retried.', { errorMessage: error.message });
    await sendAuditEvent('AIS_EVENT_TRANSITION_IGNORED', error.transition, JSON.parse(record.body) as TxMAIngressEvent);
  } else {
    logger.error('Error caught, message will be retried.', { errorMessage: (error as Error).message });
    return true;
  }
  return false;
}

/**
 * Helper function to obtain the intervention name based on the information inside the intervention event
 * @param recordBody - the record body from the SQS message
 * @returns - the Enum representation of the intervention
 */
function getEventName(recordBody: TxMAIngressEvent): EventsEnum {
  logger.debug('event is valid, starting processing');
  if (recordBody.event_name === TICF_ACCOUNT_INTERVENTION) {
    validateInterventionEvent(recordBody);
    const interventionCode = Number.parseInt(recordBody.extensions!.intervention!.intervention_code);
    return accountStateEngine.getInterventionEnumFromCode(interventionCode);
  }
  return recordBody.event_name as EventsEnum;
}

/**
 * Helper function to check that the account retrieved for the user has not been marked as deleted
 * @param intervention - the intervention name
 * @param userId - the id of the user whose account is been intervened
 * @param record - the ingress event from TxMA
 * @param itemFromDB - the data retrieved from the database
 */
async function validateAccountIsNotDeleted(
  intervention: EventsEnum,
  userId: string,
  record: TxMAIngressEvent,
  itemFromDB?: DynamoDBStateResult,
) {
  if (itemFromDB?.isAccountDeleted === true) {
    logger.warn(`${LOGS_PREFIX_SENSITIVE_INFO} user ${userId} account has been deleted.`);
    logAndPublishMetric(MetricNames.ACCOUNT_IS_MARKED_AS_DELETED);
    await sendAuditEvent('AIS_EVENT_IGNORED_ACCOUNT_DELETED', intervention, record);
    throw new ValidationError('Account is marked as deleted.');
  }
}

/**
 * Helper function to construct an account state object based on the data retrieved from the database
 * @param itemFromDB - query result from database
 * @returns - Object representing the account state
 */
function formCurrentAccountStateObject(itemFromDB?: DynamoDBStateResult) {
  return {
    blocked: itemFromDB ? itemFromDB.blocked : false,
    suspended: itemFromDB ? itemFromDB.suspended : false,
    resetPassword: itemFromDB ? itemFromDB.resetPassword : false,
    reproveIdentity: itemFromDB ? itemFromDB.reproveIdentity : false,
  };
}
