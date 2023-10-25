import { TxMAEvent } from '../data-types/interfaces';
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import { MetricNames } from '../data-types/constants';

export function validateEvent(interventionRequest: TxMAEvent): boolean {
  if (!interventionRequest.timestamp || Number.isNaN(interventionRequest.timestamp)) {
    console.log('event has no timestamp or timestamp is not a number');
    return false;
  }
  if (!interventionRequest.user?.user_id) {
    console.log('event event did not have user id field');
    return false;
  }
  if (!interventionRequest.event_name) {
    console.log('event did not have event name field');
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
    logAndPublishMetric(MetricNames.INTERVENTION_INVALID);
    return false;
  }
  return true;
}
