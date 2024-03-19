import { DynamoDBStateResult, StateDetails, TxMAIngressEvent } from '../data-types/interfaces';
import logger from '../commons/logger';
import { addMetric } from '../commons/metrics';
import { AISInterventionTypes, EventsEnum, LOGS_PREFIX_SENSITIVE_INFO, MetricNames } from '../data-types/constants';
import { ValidationError } from '../data-types/errors';
import { compileSchema } from '../commons/compile-schema';
import { TxMAIngress } from '../data-types/schemas';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { sendAuditEvent } from './send-audit-events';
import { AccountStateEngine } from './account-states/account-state-engine';

const validateInterventionDataInput = compileSchema(TxMAIngress);

/**
 * A function to check the event has the necessary fields to continue with the processing.
 *
 * @param interventionRequest - the TxMA request
 */
export function validateEventAgainstSchema(interventionRequest: TxMAIngressEvent): void {
  if (!validateInterventionDataInput({ event: interventionRequest })) {
    logger.debug(`${LOGS_PREFIX_SENSITIVE_INFO} Event has failed schema validation.`, {
      validationErrors: validateInterventionDataInput.errors,
    });
    addMetric(MetricNames.INVALID_EVENT_RECEIVED);
    throw new ValidationError('Invalid intervention event.');
  }
}

/**
 * A function to perform validation on intervention code
 *
 * @param interventionRequest - the TxMA event
 */
export function validateInterventionEvent(interventionRequest: TxMAIngressEvent): void {
  if (Number.isNaN(Number.parseInt(interventionRequest.extensions?.intervention?.intervention_code ?? ''))) {
    logger.debug('Invalid intervention request. Intervention code is NAN');
    addMetric(MetricNames.INVALID_EVENT_RECEIVED);
    throw new ValidationError('Invalid intervention event.');
  }
}

/**
 * A function to validate that the level of confidence is as expected for a IPV_IDENTITY_ISSUED event
 * @param intervention - the intervention name
 * @param event - the event received
 * @throws ValidationError - if the level of confidence is undefined or not as expected
 */
export function validateLevelOfConfidence(intervention: EventsEnum, event: TxMAIngressEvent) {
  if (intervention === EventsEnum.IPV_IDENTITY_ISSUED && event.extensions?.levelOfConfidence !== 'P2') {
    logger.warn(`Received interventions has low level of confidence: ${event.extensions?.levelOfConfidence}`);
    addMetric(MetricNames.CONFIDENCE_LEVEL_TOO_LOW);
    throw new ValidationError('Received intervention has low level of confidence.');
  }
}

/**
 * A function to validate that the event received is not in the future
 * @param eventEnum - the event name as an EventsEnum
 * @param event - the event received
 * @throws ValidationError - if the timestamp of the event is in the future
 */
export async function validateEventIsNotInFuture(eventEnum: EventsEnum, event: TxMAIngressEvent) {
  const eventTimestampInMs = event.event_timestamp_ms ?? event.timestamp * 1000;
  const now = getCurrentTimestamp().milliseconds;
  if (now < eventTimestampInMs) {
    logger.debug(`Timestamp is in the future (sec): ${eventTimestampInMs}.`);
    addMetric(MetricNames.INTERVENTION_IGNORED_IN_FUTURE);
    await sendAuditEvent('AIS_EVENT_IGNORED_IN_FUTURE', eventEnum, event);
    throw new Error('Event is in the future. It will be retried');
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
  event: TxMAIngressEvent,
  initialState: StateDetails,
  itemFromDB: DynamoDBStateResult,
) {
  const eventTimestampInMs = event.event_timestamp_ms ?? event.timestamp * 1000;
  if (!isEventAfterLastEvent(eventTimestampInMs, itemFromDB.sentAt, itemFromDB.appliedAt)) {
    logger.warn('Event received predates last applied event for this user.');
    addMetric(MetricNames.INTERVENTION_EVENT_STALE);
    await sendAuditEvent('AIS_EVENT_IGNORED_STALE', intervention, event, {
      stateResult: initialState,
      interventionName: AISInterventionTypes.AIS_NO_INTERVENTION,
      nextAllowableInterventions: AccountStateEngine.getInstance().determineNextAllowableInterventions(initialState),
    });
    throw new ValidationError('Event received predates last applied event for this user.');
  }
}

/**
 * Helper function to check if the event timestamp predates the timestamp of the latest intervention
 * @param eventTimeStamp - timestamp of the event in milliseconds
 * @param sentAt - timestamp in milliseconds of the latest intervention event applied on the account
 * @param appliedAt - timestamp in milliseconds of when the latest intervention event was applied to the account
 */
function isEventAfterLastEvent(eventTimeStamp: number, sentAt?: number, appliedAt?: number) {
  const latestIntervention = sentAt ?? appliedAt ?? 0;
  return eventTimeStamp > latestIntervention;
}

/**
 * Helper function attempt to parse a string into a JSON object
 * It returns the parsed object if successful throws a {@link ValidationError} otherwise
 * @param jsonString - string to be parsed into JSON
 * @throws ValidationError - returned if the string is not valid JSON
 * @returns TxMAIngressEvent - event parsed from string
 */
export function attemptToParseJson(jsonString: string) {
  try {
    return JSON.parse(jsonString) as TxMAIngressEvent;
  } catch (error) {
    logger.error(`${LOGS_PREFIX_SENSITIVE_INFO} record body could not be parsed to valid JSON.`, { error });
    addMetric(MetricNames.INVALID_EVENT_RECEIVED);
    throw new ValidationError('record body could not be parsed to valid JSON.');
  }
}
