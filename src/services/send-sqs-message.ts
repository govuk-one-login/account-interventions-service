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

export const sendSqsMessage = async (
  messageBody: string,
  queueUrl: string | undefined,
): Promise<SendMessageCommandOutput> => {
  if (!process.env['AWS_REGION']) {
    logger.error('AWS_REGION environment variable is not set');
    throw new Error('AWS_REGION environment variable not set');
  }
  const region = process.env['AWS_REGION'];
  const client = new SQSClient({ region });
  const message: SendMessageRequest = {
    QueueUrl: queueUrl,
    MessageBody: messageBody,
  };
  return client.send(new SendMessageCommand(message));
};

export const sendBatchSqsMessage = async (
  messages: SendMessageBatchRequestEntry[],
  queueUrl: string | undefined,
): Promise<SendMessageBatchCommandOutput> => {
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
};
