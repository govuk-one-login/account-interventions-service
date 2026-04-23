import {
  SQSClient,
  SendMessageRequest,
  SendMessageCommand,
  SendMessageCommandOutput,
  SendMessageBatchCommand,
  SendMessageBatchCommandOutput,
  SendMessageBatchRequestEntry,
} from '@aws-sdk/client-sqs';
import getEnvOrThrow from '../commons/get-env-or-throw';

export function createSqsClient() {
  const region = getEnvOrThrow('AWS_REGION');

  return new SQSClient({ region });
}

export async function sendSqsMessage(
  messageBody: string,
  queueUrl: string | undefined,
  client: SQSClient = createSqsClient(),
): Promise<SendMessageCommandOutput> {
  const message: SendMessageRequest = {
    QueueUrl: queueUrl,
    MessageBody: messageBody,
  };
  return client.send(new SendMessageCommand(message));
}

export async function sendBatchSqsMessage(
  messages: SendMessageBatchRequestEntry[],
  queueUrl: string | undefined,
  client: SQSClient = createSqsClient(),
): Promise<SendMessageBatchCommandOutput> {
  const parameters = {
    QueueUrl: queueUrl,
    Entries: messages,
  };
  const command = new SendMessageBatchCommand(parameters);
  return client.send(command);
}
