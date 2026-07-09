import { SQSEvent, Context } from 'aws-lambda';
import logger from '../commons/logger';
import { processTxmaEvents } from './txma-processor';
import { createSqsClient, SqsMessageService } from '../services/message-service';
import { SQSClient } from '@aws-sdk/client-sqs';
import getEnvironmentOrThrow from '../commons/get-environment-or-throw';

const generateSqsMessageService = (queueName: string, client: SQSClient) =>
  new SqsMessageService(getEnvironmentOrThrow(queueName), {
    client,
  });

export async function handler(event: SQSEvent, context: Context): Promise<void> {
  logger.addContext(context);

  const sqsClient = createSqsClient();

  await processTxmaEvents(event, {
    interventionMessageService: generateSqsMessageService('ACCOUNT_INTERVENTION_SQS_QUEUE', sqsClient),
    deletionMessageService: generateSqsMessageService('ACCOUNT_DELETION_SQS_QUEUE', sqsClient),
  });
}
