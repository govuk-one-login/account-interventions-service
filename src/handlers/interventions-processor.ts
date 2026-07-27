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
import { CurrentTimeDescriptor, DynamoDBStateResult, StateDetails } from '../data-types/interfaces';
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
import { SQSClient } from '@aws-sdk/client-sqs';

export interface ProcessInterventionsArgs {
  accountStatusService: AccountStatusService;
  interventionEventsService: InterventionEventsService;
  accountStateEngine: AccountStateEngine;
  config: { historyRetentionSeconds: number; txmaEgressQueueUrl: string };
  sqsClient: SQSClient;
}

export async function processInterventions(event: SQSEvent, dependencies: ProcessInterventionsArgs): Promise<SQSBatchResponse> {
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
      await processSQSRecord(record, dependencies);
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
 * Main worker function. It receives an SQS record and processes it according to business logic.
 * It parses and identifies the event, then delegates the validation and application of the
 * intervention. It is the single owner of audit-event sending: on success it emits the
 * transition-applied event, and on failure it inspects the thrown error and emits the
 * appropriate audit event before re-throwing. The validation helpers it calls are pure and
 * merely describe (via the thrown error) which audit event should be sent.
 * @param record - SQS Record polled from the queue
 * @param deps - the services, config and clients required to process the record
 */
async function processSQSRecord(record: SQSRecord, dependencies: ProcessInterventionsArgs) {
  const { accountStateEngine, config, sqsClient } = dependencies;
  const currentTimestamp = getCurrentTimestamp();

  const result = validateEventAgainstSchema(attemptToParseJson(record.body));
  const eventName = getEventName(result, accountStateEngine);
  logger.debug('Intervention received.', { intervention: eventName });

  try {
    await applyInterventionEvent(result, eventName, currentTimestamp, dependencies);
  } catch (error) {
    await sendFailureAuditEvent(error, eventName, result, sqsClient, config.txmaEgressQueueUrl);
    throw error;
  }
}

/**
 * Runs the pure validations, applies the state transition and persists the outcome for a record
 * that has already been parsed and identified. Emits the success (transition-applied) audit event.
 * All failure audit events are handled by the caller.
 */
async function applyInterventionEvent(
  result: InterventionEventMessage,
  eventName: EventsEnum,
  currentTimestamp: CurrentTimeDescriptor,
  { accountStatusService, interventionEventsService, accountStateEngine, config, sqsClient }: ProcessInterventionsArgs,
) {
  const userId = result.user.user_id;

  validateIfIdentityAcquired(result);
  validateEventIsNotInFuture(eventName, result);

  addMetric(MetricNames.EVENT_DELIVERY_LATENCY, noMetadata, currentTimestamp.milliseconds - result.event_timestamp_ms);

  const itemFromDB = await accountStatusService.getAccountStateInformation(userId);
  const currentAccountState = formCurrentAccountStateObject(itemFromDB);

  if (itemFromDB) {
    validateAccountIsNotDeleted(userId, currentAccountState, itemFromDB);
    validateEventIsNotStale(result, currentAccountState, itemFromDB);
  }

  const statusResult = await applyEventTransition(
    eventName,
    currentAccountState,
    itemFromDB?.intervention,
    result,
    interventionEventsService,
    accountStateEngine,
  );

  await accountStatusService.updateUserStatus(userId, statusResult, currentTimestamp, result, itemFromDB?.history ?? []);
  publishTimeToResolveMetrics(
    currentAccountState,
    statusResult.stateResult,
    itemFromDB?.appliedAt ?? currentTimestamp.milliseconds,
    currentTimestamp.milliseconds,
    eventName,
  );
  updateAccountStateCountMetric(currentAccountState, statusResult.stateResult);
  addMetric(MetricNames.INTERVENTION_EVENT_APPLIED, [], 1, { eventName });
  await sendAuditEvent('AIS_EVENT_TRANSITION_APPLIED', eventName, result, sqsClient, config.txmaEgressQueueUrl, statusResult);

  await persistEventsSafely(result, eventName, itemFromDB, interventionEventsService, config.historyRetentionSeconds);
}

/**
 * Sends the failure audit event that corresponds to the given error, if any. This is the single
 * place that maps a thrown error to its audit event, keeping the validation helpers pure.
 * @param error - the error thrown while processing the record
 * @param eventName - the resolved ingress event name
 * @param event - the ingress event from TxMA
 * @param sqsClient - the SQS client used to send the audit event
 * @param txmaEgressQueueUrl - the TxMA egress queue URL
 */
async function sendFailureAuditEvent(
  error: unknown,
  eventName: EventsEnum,
  event: InterventionEventMessage,
  sqsClient: SQSClient,
  txmaEgressQueueUrl: string,
) {
  if (error instanceof StateTransitionError) {
    await sendAuditEvent('AIS_EVENT_TRANSITION_IGNORED', error.transition, event, sqsClient, txmaEgressQueueUrl, error.output);
    return;
  }

  const auditEvent = error instanceof ValidationError || error instanceof RetryEventError ? error.auditEvent : undefined;
  if (!auditEvent) return;

  if (auditEvent.accountStateEngineOutput === undefined) {
    await sendAuditEvent(auditEvent.egressEventName, eventName, event, sqsClient, txmaEgressQueueUrl);
    return;
  }
  await sendAuditEvent(auditEvent.egressEventName, eventName, event, sqsClient, txmaEgressQueueUrl, auditEvent.accountStateEngineOutput);
}

/**
 * Attempts to apply the state transition. On a {@link StateTransitionError} it persists the
 * ignored intervention event (a database side effect); the corresponding audit event is emitted
 * centrally by the caller.
 */
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
      await persistIgnoredEventSafely(result, event, initialState, interventionEventsService);
    }
    throw error;
  }
}

/**
 * Persists an ignored intervention event, swallowing and logging any persistence failure so that
 * it does not mask the originating {@link StateTransitionError}.
 */
async function persistIgnoredEventSafely(
  result: InterventionEventMessage,
  event: EventsEnum,
  initialState: StateDetails,
  interventionEventsService: InterventionEventsService,
) {
  try {
    await persistIgnoredInterventionEvent(result, event, initialState, interventionEventsService);
  } catch (error) {
    logger.error('Error caught whilst attempting to persist ignored event.', {
      errorMessage: (error as Error).message,
    });
    addMetric(MetricNames.PERSIST_INTERVENTION_EVENTS_ERROR);
  }
}

/**
 * Persists the intervention event, swallowing and logging any persistence failure.
 */
async function persistEventsSafely(
  result: InterventionEventMessage,
  eventName: EventsEnum,
  itemFromDB: DynamoDBStateResult | undefined,
  interventionEventsService: InterventionEventsService,
  historyRetentionSeconds: number,
) {
  try {
    await persistInterventionEvents(result, eventName, itemFromDB, interventionEventsService, historyRetentionSeconds);
  } catch (error) {
    logger.error('Error caught while persisting intervention events.', { errorMessage: (error as Error).message });
    addMetric(MetricNames.PERSIST_INTERVENTION_EVENTS_ERROR);
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
 * Helper function to check that the account retrieved for the user has not been marked as deleted.
 * This function is pure: it performs no I/O. When the account is deleted it throws a
 * {@link ValidationError} carrying the audit-event intent, leaving the central processing
 * function to actually emit the audit event.
 * @param userId - the id of the user whose account is been intervened
 * @param initialState - initial state of the account
 * @param itemFromDB - the data retrieved from the database
 */
function validateAccountIsNotDeleted(userId: string, initialState: StateDetails, itemFromDB: DynamoDBStateResult) {
  if (!itemFromDB.isAccountDeleted) return;

  logger.warn(`${LOGS_PREFIX_SENSITIVE_INFO} user ${userId} account has been deleted.`);
  addMetric(MetricNames.ACCOUNT_IS_MARKED_AS_DELETED);
  throw new ValidationError('Account is marked as deleted.', {
    egressEventName: 'AIS_EVENT_IGNORED_ACCOUNT_DELETED',
    accountStateEngineOutput: {
      stateResult: initialState,
      interventionName: AISInterventionTypes.AIS_NO_INTERVENTION,
      nextAllowableInterventions: AccountStateEngine.getInstance().determineNextAllowableInterventions(initialState),
    },
  });
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
