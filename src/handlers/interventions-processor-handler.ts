/* istanbul ignore start -- production only. File also added to sonar.coverage.exclusions in sonar-project.properties */

import { Context, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import logger from '../commons/logger';
import { getPersistentInterventionEventsService } from '../tables/intervention-events';
import { getPersistentAccountStatusService } from '../tables/account-status';
import { processInterventions } from './interventions-processor';
import { AccountStateEngine } from '../services/account-states/account-state-engine';

const accountStatusService = getPersistentAccountStatusService();
const interventionEventsService = getPersistentInterventionEventsService();
const accountStateEngine = AccountStateEngine.getInstance();

/**
 * Main handler method for Intervention Processor Lambda
 * It iterates over the messages polled from the queue, it processes each record, and returns the list of items that failed processing to be retried
 * @param event - SQSEvent containing the intervention event
 * @param context - context object
 * @returns - Promise of SQS Partial Batch Response
 */
export async function handler(
  event: SQSEvent,
  context: Context,
): Promise<SQSBatchResponse> {
  logger.addContext(context);
  return processInterventions(event, {
    accountStatusService,
    interventionEventsService,
    accountStateEngine,
  });
}

/* istanbul ignore stop */
