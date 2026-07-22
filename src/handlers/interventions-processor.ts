import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';
import logger from '../commons/logger';
import { addMetric, metric } from '../commons/metrics';
import {
  AISInterventionTypes,
  EventsEnum,
  LOGS_PREFIX_SENSITIVE_INFO,
  MetricNames,
  noMetadata,
  TriggerEventsEnum,
} from '../data-types/constants';
import { DynamoDBStateResult, StateDetails } from '../data-types/interfaces';
import { RetryEventError, StateTransitionError, TooManyRecordsError, ValidationError } from '../data-types/errors';
import {
  attemptToParseJson,
  validateEventAgainstSchema,
  validateEventIsNotInFuture,
  validateEventIsNotStale,
  validateIfIdentityAcquired,
} from '../services/validate-event';
import { AccountStateEngine } from '../services/account-states/account-state-engine';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { sendAuditEvent } from '../services/send-audit-events';
import { publishTimeToResolveMetrics, updateAccountStateCountMetric } from '../commons/metrics-helper';
import { InterventionEventMessage } from '../contracts/intervention-events';
import persistInterventionEvents, { persistIgnoredInterventionEvent } from '../services/persist-intervention-events';
import { InterventionEventsService } from '../tables/intervention-events';
import { AccountStatusService } from '../tables/account-status';
export interface Config {
  accountStatusService: AccountStatusService,
  interventionEventsService: InterventionEventsService,
  accountStateEngine: AccountStateEngine,
}

export async function processInterventions(
  event: SQSEvent,
  config: Config,
): Promise<SQSBatchResponse> {
  if (event.Records.length === 0) {
    logger.warn('Received no records.');
    addMetric(MetricNames.INVALID_EVENT_RECEIVED);
    metric.publishStoredMetrics();
    return {
      batchItemFailures: [],
    };
  }

  const itemFailures: SQSBatchItemFailure[] = [];

  const promiseArray = event.Records.map(async (record: SQSRecord) => {
    try {
      await processSQSRecord(record, config.accountStatusService, config.interventionEventsService, config.accountStateEngine);
    } catch (error: unknown) {
      const itemIdentifier = handleError(error, record);
      if (itemIdentifier) itemFailures.push({ itemIdentifier });
    }
  });
  await Promise.all(promiseArray);
  metric.publishStoredMetrics();
  logger.debug('returning items that failed processing: ' + JSON.stringify(itemFailures));
  return {
    batchItemFailures: itemFailures,
  };
}

/**
 * Main worker function. It receives an SQS record and processes it according to business logic
 * It validates the event, it retrieves user data from the database, it applies the intervention,
 * it updates the user record in the database, it sends a notification upon completion
 * @param record - SQS Record polled from the queue
 */
async function processSQSRecord(
  record: SQSRecord,
  accountStatusService: AccountStatusService,
  interventionEventsService: InterventionEventsService,
  accountStateEngine: AccountStateEngine,
) {
  const currentTimestamp = getCurrentTimestamp();

  const recordBody = attemptToParseJson(record.body);

  const { result, eventName } = await validateRecord(recordBody, accountStateEngine);

  const userId = result.user.user_id;

  addMetric(MetricNames.EVENT_DELIVERY_LATENCY, noMetadata, currentTimestamp.milliseconds - result.event_timestamp_ms);

  const itemFromDB = await accountStatusService.getAccountStateInformation(userId);

  const currentAccountState = formCurrentAccountStateObject(itemFromDB);

  if (itemFromDB) {
    await validateAccountIsNotDeleted(eventName, userId, result, currentAccountState, itemFromDB);
    await validateEventIsNotStale(eventName, result, currentAccountState, itemFromDB);
  }

  const statusResult = await applyEventTransition(
    eventName,
    currentAccountState,
    itemFromDB?.intervention,
    result,
    interventionEventsService,
    accountStateEngine,
  );

  await accountStatusService.updateUserStatus(
    userId,
    statusResult,
    currentTimestamp,
    result,
    itemFromDB?.history ?? [],
  );
  publishTimeToResolveMetrics(
    currentAccountState,
    statusResult.stateResult,
    itemFromDB?.appliedAt ?? currentTimestamp.milliseconds,
    currentTimestamp.milliseconds,
    eventName,
  );

  updateAccountStateCountMetric(currentAccountState, statusResult.stateResult);
  addMetric(MetricNames.INTERVENTION_EVENT_APPLIED, [], 1, { eventName });
  await sendAuditEvent('AIS_EVENT_TRANSITION_APPLIED', eventName, result, statusResult);

  try {
    await persistInterventionEvents(result, eventName, itemFromDB, interventionEventsService);
  } catch (error) {
    logger.error('Error caught while persisting intervention events.', { errorMessage: (error as Error).message });
    addMetric(MetricNames.PERSIST_INTERVENTION_EVENTS_ERROR);
  }
}

async function validateRecord(recordBody: unknown, accountStateEngine: AccountStateEngine) {
  const result = validateEventAgainstSchema(recordBody);
  const eventName = getEventName(result, accountStateEngine);
  logger.debug('Intervention received.', { intervention: eventName });
  validateIfIdentityAcquired(result);
  await validateEventIsNotInFuture(eventName, result);

  return {
    result,
    eventName,
  };
}

async function applyEventTransition(
  event: EventsEnum,
  initialState: StateDetails,
  interventionName: string | undefined,
  result: InterventionEventMessage,
  interventionEventsService: InterventionEventsService,
  accountStateEngine: AccountStateEngine,
) {
  try {
    return accountStateEngine.applyEventTransition(event, initialState, interventionName);
  } catch (error) {
    if (error instanceof StateTransitionError) {
      await sendAuditEvent('AIS_EVENT_TRANSITION_IGNORED', error.transition, result, error.output);
      try {
        await persistIgnoredInterventionEvent(result, event, initialState, interventionEventsService);
      } catch (error) {
        logger.error('Error caught whilst attempting to persist ignored event.', {
          errorMessage: (error as Error).message,
        });
        addMetric(MetricNames.PERSIST_INTERVENTION_EVENTS_ERROR);
      }
    }
    throw error;
  }
}

/**
 * Function to handle an error returned by the recording processing function
 * It logs appropriate messages and returns a message id if the Error type is not of a non-retryable type
 * @param error - error throw by the processing function
 * @param record - the record inside the message polled
 * @returns messageId - if the message should be retried
 */
function handleError(error: unknown, record: SQSRecord) {
  if (error instanceof ValidationError)
    logger.warn('ValidationError caught, message will not be retried.', { errorMessage: error.message });
  else if (error instanceof TooManyRecordsError)
    logger.warn('Too many records were returned from the database. Message will not be retried', {
      errorMessage: error.message,
    });
  else if (error instanceof StateTransitionError) {
    logger.warn('StateTransitionError caught, message will not be retried.', { errorMessage: error.message });
  } else if (error instanceof RetryEventError) {
    logger.warn('RetryEventError caught, message will be retried.', { errorMessage: error.message });
    return record.messageId;
  } else {
    logger.error('Error caught, message will be retried.', { errorMessage: (error as Error).message });
    return record.messageId;
  }
}

/**
 * Helper function to obtain the intervention name based on the information inside the intervention event
 * @param recordBody - the record body from the SQS message
 * @returns - the Enum representation of the intervention
 */
function getEventName(recordBody: InterventionEventMessage, accountStateEngine: AccountStateEngine): EventsEnum {
  logger.debug('event is valid, starting processing');
  if (recordBody.event_name === TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION) {
    const interventionCode = recordBody.extensions.intervention.intervention_code;
    return accountStateEngine.getInterventionEnumFromCode(interventionCode);
  }
  return recordBody.event_name;
}

/**
 * Helper function to check that the account retrieved for the user has not been marked as deleted
 * @param intervention - the intervention name
 * @param userId - the id of the user whose account is been intervened
 * @param record - the ingress event from TxMA
 * @param itemFromDB - the data retrieved from the database
 * @param initialState - initial state of the account
 */
async function validateAccountIsNotDeleted(
  intervention: EventsEnum,
  userId: string,
  record: InterventionEventMessage,
  initialState: StateDetails,
  itemFromDB: DynamoDBStateResult,
) {
  if (!itemFromDB.isAccountDeleted) return;

  logger.warn(`${LOGS_PREFIX_SENSITIVE_INFO} user ${userId} account has been deleted.`);
  addMetric(MetricNames.ACCOUNT_IS_MARKED_AS_DELETED);
  await sendAuditEvent('AIS_EVENT_IGNORED_ACCOUNT_DELETED', intervention, record, {
    stateResult: initialState,
    interventionName: AISInterventionTypes.AIS_NO_INTERVENTION,
    nextAllowableInterventions: AccountStateEngine.getInstance().determineNextAllowableInterventions(initialState),
  });
  throw new ValidationError('Account is marked as deleted.');
}

/**
 * Helper function to construct an account state object based on the data retrieved from the database
 * @param itemFromDB - query result from database
 * @returns - Object representing the account state
 */
function formCurrentAccountStateObject(itemFromDB?: DynamoDBStateResult): StateDetails {
  if (!itemFromDB)
    return {
      blocked: false,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
    };

  return {
    blocked: itemFromDB.blocked,
    suspended: itemFromDB.suspended,
    resetPassword: itemFromDB.resetPassword,
    reproveIdentity: itemFromDB.reproveIdentity,
  };
}
