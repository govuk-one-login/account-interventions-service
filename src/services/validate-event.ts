import { TxMAEvent } from '../data-types/interfaces';
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import { MetricNames } from '../data-types/constants';
import { ValidationError } from '../data-types/errors';

/**
 * A function to check the event has the necessary fields to continue with the processing.
 *
 * @param interventionRequest - the TxMA request
 */
export function validateEvent(interventionRequest: TxMAEvent): void {
  if (
    !interventionRequest.timestamp ||
    Number.isNaN(interventionRequest.timestamp) ||
    !interventionRequest.user?.user_id ||
    !interventionRequest.event_name
  ) {
    logger.debug('event has failed initial validation');
    logAndPublishMetric(MetricNames.INVALID_EVENT_RECEIVED);
    throw new ValidationError('Invalid intervention event.');
  }
}

/**
 * A function to perform additional checks if the event is of type TICF_ACCOUNT_INTERVENTION
 *
 * @param interventionRequest - the TxMA event
 */
export function validateInterventionEvent(interventionRequest: TxMAEvent): void {
  if (
    !interventionRequest.extensions ||
    !interventionRequest.extensions.intervention ||
    !interventionRequest.extensions.intervention.intervention_code ||
    Number.isNaN(Number.parseInt(interventionRequest.extensions.intervention.intervention_code))
  ) {
    logger.debug('Invalid intervention request.');
    logAndPublishMetric(MetricNames.INVALID_EVENT_RECEIVED);
    throw new ValidationError('Invalid intervention event.');
  }
}
