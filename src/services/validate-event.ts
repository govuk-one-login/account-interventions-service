import { TxMAEvent } from '../data-types/interfaces';
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import { MetricNames } from '../data-types/constants';

export function validateEvent(interventionRequest: TxMAEvent): boolean {
  if (!interventionRequest.timestamp || Number.isNaN(interventionRequest.timestamp)) {
    logger.debug('event has no timestamp or timestamp is not a number');
    return false;
  }
  if (!interventionRequest.user?.user_id) {
    logger.debug('event event did not have user id field');
    return false;
  }
  if (!interventionRequest.event_name) {
    logger.debug('event did not have event name field');
    return false;
  }
  return true;
}

export function validateInterventionEvent(interventionRequest: TxMAEvent): boolean {
  if (
    !interventionRequest.extension ||
    !interventionRequest.extension.intervention ||
    !interventionRequest.extension.intervention.intervention_code
  ) {
    logger.debug('Invalid intervention request.');
    logAndPublishMetric(MetricNames.INVALID_EVENT_RECEIVED);
    return false;
  }
  return true;
}
