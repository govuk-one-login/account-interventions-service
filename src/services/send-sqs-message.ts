import {
  SQSClient,
  SendMessageRequest,
  SendMessageCommand,
  SendMessageCommandOutput,
  SendMessageBatchCommand,
  SendMessageBatchCommandOutput,
  SendMessageBatchRequestEntry,
} from '@aws-sdk/client-sqs';
import logger from '../commons/logger';
import tracer from '../commons/tracer';

export async function sendSqsMessage(
  messageBody: string,
  queueUrl: string | undefined,
): Promise<SendMessageCommandOutput> {
  if (!process.env['AWS_REGION']) {
    logger.error('AWS_REGION environment variable is not set');
    throw new Error('AWS_REGION environment variable not set');
  }
  const region = process.env['AWS_REGION'];
  const client = tracer.captureAWSv3Client(new SQSClient({ region }));
  const message: SendMessageRequest = {
    QueueUrl: queueUrl,
    MessageBody: messageBody,
  };
  return client.send(new SendMessageCommand(message));
}

export async function sendBatchSqsMessage(
  messages: SendMessageBatchRequestEntry[],
  queueUrl: string | undefined,
): Promise<SendMessageBatchCommandOutput> {
  if (!process.env['AWS_REGION']) {
    logger.error('AWS_REGION environment variable is not set');
    throw new Error('AWS_REGION environment variable not set');
  }
  const region = process.env['AWS_REGION'];
  const client = new SQSClient({ region });
  const parameters = {
    QueueUrl: queueUrl,
    Entries: messages,
  };
  const command = new SendMessageBatchCommand(parameters);
  return client.send(command);
}
