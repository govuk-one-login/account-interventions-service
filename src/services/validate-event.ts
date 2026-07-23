import { DynamoDBStateResult, StateDetails } from '../data-types/interfaces';
import logger from '../commons/logger';
import { addMetric } from '../commons/metrics';
import { AISInterventionTypes, EventsEnum, LOGS_PREFIX_SENSITIVE_INFO, MetricNames } from '../data-types/constants';
import { RetryEventError, ValidationError } from '../data-types/errors';
import { compileSchema } from '../commons/compile-schema';
import { EventCatalogueCombinedSchema } from '../data-types/event-catalogue-combined-schema';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { sendAuditEvent } from './send-audit-events';
import { AccountStateEngine } from './account-states/account-state-engine';
import jsonSafeParse from '../commons/json-safe-parse';
import { InterventionEventMessage, interventionMessageSchema } from '../contracts/intervention-events';
import { SQSClient } from '@aws-sdk/client-sqs';

const validateEventCatalogue = compileSchema(EventCatalogueCombinedSchema);

/**
 * A function to check the event has the necessary fields to continue with the processing.
 *
 * @param interventionRequest - the TxMA request
 */
export function validateEventAgainstSchema(interventionRequest: unknown) {
  // Validate with Zod
  const result = interventionMessageSchema.safeParse(interventionRequest);
  if (!result.success) {
    logger.debug(`${LOGS_PREFIX_SENSITIVE_INFO} Event has failed schema validation.`, {
      validationErrors: result.error,
    });
    addMetric(MetricNames.INVALID_EVENT_RECEIVED);
    throw new ValidationError('Invalid intervention event.');
  }

  // Validate against event catalogue JSON schema
  if (!validateEventCatalogue(interventionRequest)) {
    logger.info(`${LOGS_PREFIX_SENSITIVE_INFO} Event has failed event catalogue schema validation.`, {
      validationErrors: validateEventCatalogue.errors,
    });
    addMetric(MetricNames.INVALID_EVENT_RECEIVED_EVENT_CATALOGUE, undefined, undefined, {
      EVENT_NAME: result.data.event_name,
    });
  }

  return result.data;
}

/**
 * A function to validate that the status is as expected for a IPV_ACCOUNT_INTERVENTION_END event
 * @param intervention - the intervention name
 * @param event - the event received
 * @throws ValidationError - if the status is undefined or not as expected
 */
export function validateIfIdentityAcquired(event: InterventionEventMessage) {
  if (event.event_name !== EventsEnum.IPV_ACCOUNT_INTERVENTION_END || event.extensions.success) return;

  logger.warn('Received event that does not meet criteria to lift intervention.', {
    success: event.extensions.success,
    type: event.extensions.type,
  });
  addMetric(MetricNames.IDENTITY_NOT_SUFFICIENTLY_PROVED);
  throw new ValidationError('Received event that does not meet criteria to lift intervention.');
}

/**
 * A function to validate that the event received is not in the future
 * @param eventEnum - the event name as an EventsEnum
 * @param event - the event received
 * @throws RetryEventError - if the timestamp of the event is in the future
 */
export async function validateEventIsNotInFuture(
  eventEnum: EventsEnum,
  event: InterventionEventMessage,
  sqsClient: SQSClient,
  txmaEgressQueueUrl: string,
) {
  const eventTimestampInMs = event.event_timestamp_ms;
  const now = getCurrentTimestamp().milliseconds;
  if (now < eventTimestampInMs) {
    logger.warn('Event with timestamp in the future.', {
      eventName: event.event_name,
      emittedAt: new Date(eventTimestampInMs).toISOString(),
      currentTime: new Date(now).toISOString(),
      msInTheFuture: eventTimestampInMs - now,
      event: eventEnum,
    });
    addMetric(MetricNames.INTERVENTION_IGNORED_IN_FUTURE);
    await sendAuditEvent('AIS_EVENT_IGNORED_IN_FUTURE', eventEnum, event, sqsClient, txmaEgressQueueUrl);
    throw new RetryEventError('Event has timestamp that is in the future.');
  }
}

/**
 * A function to validate that the event is not stale
 * @param intervention - the intervention name
 * @param event - the event received
 * @param itemFromDB - the user data retrieved from the database
 * @param initialState - initial state of the account
 * @throws ValidationError - if the time of the event pre-dates the timestamp of the latest intervention applied on the account
 */
export async function validateEventIsNotStale(
  intervention: EventsEnum,
  event: InterventionEventMessage,
  initialState: StateDetails,
  itemFromDB: DynamoDBStateResult,
  sqsClient: SQSClient,
  txmaEgressQueueUrl: string,
) {
  const eventTimestampInMs = event.event_timestamp_ms;
  if (!isEventAfterLastEvent(eventTimestampInMs, itemFromDB.sentAt, itemFromDB.appliedAt)) {
    logger.warn('Event received predates last applied event for this user.');
    addMetric(MetricNames.INTERVENTION_EVENT_STALE);
    await sendAuditEvent('AIS_EVENT_IGNORED_STALE', intervention, event, sqsClient, txmaEgressQueueUrl, {
      stateResult: initialState,
      interventionName: AISInterventionTypes.AIS_NO_INTERVENTION,
      nextAllowableInterventions: AccountStateEngine.getInstance().determineNextAllowableInterventions(initialState),
    });
    throw new ValidationError('Event received predates last applied event for this user.');
  }
}

/**
 * Helper function to check if the event timestamp predates the timestamp of the latest intervention
 * @param eventTimestamp - timestamp of the event in milliseconds
 * @param sentAt - timestamp in milliseconds of the latest intervention event applied on the account
 * @param appliedAt - timestamp in milliseconds of when the latest intervention event was applied to the account
 */
function isEventAfterLastEvent(eventTimestamp: number, sentAt?: number, appliedAt?: number) {
  const latestIntervention = sentAt ?? appliedAt ?? 0;
  return eventTimestamp > latestIntervention;
}

/**
 * Helper function attempt to parse a string into a JSON object
 * It returns the parsed object if successful throws a {@link ValidationError} otherwise
 * @param jsonString - string to be parsed into JSON
 * @throws ValidationError - returned if the string is not valid JSON
 * @returns TxMAIngressEvent - event parsed from string
 */
export function attemptToParseJson(jsonString: string) {
  const parseResult = jsonSafeParse(jsonString);

  if (parseResult.success) return parseResult.data;

  logger.error(`${LOGS_PREFIX_SENSITIVE_INFO} record body could not be parsed to valid JSON.`, {
    error: parseResult.error,
  });
  addMetric(MetricNames.INVALID_EVENT_RECEIVED);
  throw new ValidationError('record body could not be parsed to valid JSON.');
}
