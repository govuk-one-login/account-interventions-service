/* istanbul ignore start -- production only. File also added to sonar.coverage.exclusions in sonar-project.properties */

import { Context, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import logger from '../commons/logger';
import { getPersistentInterventionEventsService } from '../tables/intervention-events';
import { getPersistentAccountStatusService } from '../tables/account-status';
import { processInterventions } from './interventions-processor';
import { AccountStateEngine } from '../services/account-states/account-state-engine';
import { AppConfigService } from '../services/app-config-service';
import tracer from '../commons/tracer';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { SQSClient } from '@aws-sdk/client-sqs';

const accountStatusService = getPersistentAccountStatusService();
const interventionEventsService = getPersistentInterventionEventsService();
const accountStateEngine = AccountStateEngine.getInstance();
const config = AppConfigService.getInstance().getConfigObject(['historyRetentionSeconds', 'txmaEgressQueueUrl', 'awsRegion']);
const sqsClient = tracer.captureAWSv3Client(
  new SQSClient({
    region: config.awsRegion,
    maxAttempts: 2,
    requestHandler: new NodeHttpHandler({ requestTimeout: 5000 }),
  }),
);

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
  return processInterventions(event, { accountStatusService, interventionEventsService, accountStateEngine, config, sqsClient });
}

/* istanbul ignore stop */
