import { TxMAEvent } from '../data-types/interfaces';
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import { MetricNames } from '../data-types/constants';
import { ValidationError } from '../data-types/errors';

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

export function validateInterventionEvent(interventionRequest: TxMAEvent): void {
  if (
    !interventionRequest.extension ||
    !interventionRequest.extension.intervention ||
    !interventionRequest.extension.intervention.intervention_code ||
    Number.isNaN(Number.parseInt(interventionRequest.extension.intervention.intervention_code))
  ) {
    logger.debug('Invalid intervention request.');
    logAndPublishMetric(MetricNames.INVALID_EVENT_RECEIVED);
    throw new ValidationError('Invalid intervention event.');
  }
}
