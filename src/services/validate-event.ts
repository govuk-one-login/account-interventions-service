import { TxMAIngressEvent } from '../data-types/interfaces';
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import { LOGS_PREFIX_SENSITIVE_INFO, MetricNames } from '../data-types/constants';
import { ValidationError } from '../data-types/errors';
import { compileSchema } from '../commons/compile-schema';
import { TxMAIngress } from '../data-types/schemas';

const validateInterventionDataInput = compileSchema(TxMAIngress);

/**
 * A function to check the event has the necessary fields to continue with the processing.
 *
 * @param interventionRequest - the TxMA request
 */
export function validateEvent(interventionRequest: TxMAIngressEvent): void {
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
