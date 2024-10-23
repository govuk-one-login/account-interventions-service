import { SQSClient, SendMessageRequest, SendMessageCommand, SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import assert from 'node:assert/strict';

export const sendSqsMessage = async (
  messageBody: string,
  queueUrl: string | undefined,
): Promise<SendMessageCommandOutput> => {
  assert(process.env['AWS_REGION'], 'AWS_REGION environment variable not set');
  const region = process.env['AWS_REGION'];
  const client = new SQSClient({ region });
  const message: SendMessageRequest = {
    QueueUrl: queueUrl,
    MessageBody: messageBody,
  };
  return client.send(new SendMessageCommand(message));
};
