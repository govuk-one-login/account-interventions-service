import { DynamoDBStateResult, TxMAIngressEvent } from '../data-types/interfaces';
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import { EventsEnum, LOGS_PREFIX_SENSITIVE_INFO, MetricNames } from '../data-types/constants';
import { ValidationError } from '../data-types/errors';
import { compileSchema } from '../commons/compile-schema';
import { TxMAIngress } from '../data-types/schemas';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { sendAuditEvent } from './send-audit-events';

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
    logAndPublishMetric(MetricNames.INVALID_EVENT_RECEIVED);
    throw new ValidationError('Invalid intervention event.');
  }
}

/**
 * A function to perform validation on intervention code
 *
 * @param interventionRequest - the TxMA event
 */
export function validateInterventionEvent(interventionRequest: TxMAIngressEvent): void {
  if (Number.isNaN(Number.parseInt(interventionRequest.extensions!.intervention!.intervention_code))) {
    logger.debug('Invalid intervention request. Intervention code is NAN');
    logAndPublishMetric(MetricNames.INVALID_EVENT_RECEIVED);
    throw new ValidationError('Invalid intervention event.');
  }
}

export function validateLevelOfConfidence(intervention: EventsEnum, event: TxMAIngressEvent) {
  if (intervention === EventsEnum.IPV_IDENTITY_ISSUED && event.extensions?.levelOfConfidence !== 'P2') {
    logger.warn(`Received interventions has low level of confidence: ${event.extensions?.levelOfConfidence}`);
    logAndPublishMetric(MetricNames.CONFIDENCE_LEVEL_TOO_LOW);
    throw new ValidationError('Received intervention has low level of confidence.');
  }
}

export async function validateEventIsNotInFuture(intervention: EventsEnum, event: TxMAIngressEvent) {
  const eventTimestampInMs = event.event_timestamp_ms ?? event.timestamp * 1000;
  const now = getCurrentTimestamp().milliseconds;
  if (now < eventTimestampInMs) {
    logger.debug(`Timestamp is in the future (sec): ${eventTimestampInMs}.`);
    logAndPublishMetric(MetricNames.INTERVENTION_IGNORED_IN_FUTURE);
    await sendAuditEvent('AIS_INTERVENTION_IGNORED_IN_FUTURE', event.user.user_id, {
      intervention,
      reason: 'received event is in the future',
      appliedAt: undefined,
    });
    throw new Error('Event is in the future. It will be retried');
  }
}

export async function validateEventIsNotStale(
  intervention: EventsEnum,
  event: TxMAIngressEvent,
  itemFromDB?: DynamoDBStateResult,
) {
  const eventTimestampInMs = event.event_timestamp_ms ?? event.timestamp * 1000;
  if (!isEventAfterLastEvent(eventTimestampInMs, itemFromDB?.sentAt, itemFromDB?.appliedAt)) {
    logger.warn('Event received predates last applied event for this user.');
    logAndPublishMetric(MetricNames.INTERVENTION_EVENT_STALE);
    await sendAuditEvent('AIS_INTERVENTION_IGNORED_STALE', event.user.user_id, {
      intervention,
      appliedAt: undefined,
      reason: 'Received intervention predates latest applied intervention',
    });
    throw new ValidationError('Event received predates last applied event for this user.');
  }
}

function isEventAfterLastEvent(eventTimeStamp: number, sentAt?: number, appliedAt?: number) {
  const latestIntervention = sentAt ?? appliedAt ?? 0;
  return eventTimeStamp > latestIntervention;
}
