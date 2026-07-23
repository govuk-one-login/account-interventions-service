import {
  SQSClient,
  SendMessageRequest,
  SendMessageCommand,
  SendMessageCommandOutput,
  SendMessageBatchCommand,
  SendMessageBatchCommandOutput,
  SendMessageBatchRequestEntry,
} from '@aws-sdk/client-sqs';
import tracer from '../commons/tracer';
import getEnvironmentOrThrow from '../commons/get-environment-or-throw';
import logger from '../commons/logger';

export function createSqsClient() {
  const region = getEnvironmentOrThrow('AWS_REGION');

  return tracer.captureAWSv3Client(new SQSClient({ region }));
}

export interface MessageService {
  sendMessage(messageBody: object | string): Promise<SendMessageCommandOutput>;
  sendBatchMessage(messages: SendMessageBatchRequestEntry[]): Promise<SendMessageBatchCommandOutput>;
}

export interface SqsMessageServiceConfig {
  client?: SQSClient;
}

export class SqsMessageService implements MessageService {
  protected client: SQSClient;

  constructor(
    readonly queueUrl: string | undefined,
    readonly config?: SqsMessageServiceConfig,
  ) {
    if (!queueUrl) {
      logger.error('Missing queueUrl parameter');
      throw new MissingQueueUrl('Missing queueUrl parameter');
    }

    this.client = config?.client ?? createSqsClient();
  }

  async sendMessage(messageBody: object) {
    const message: SendMessageRequest = {
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(messageBody),
    };
    return await this.client.send(new SendMessageCommand(message));
  }

  async sendBatchMessage(messages: SendMessageBatchRequestEntry[]) {
    const parameters = {
      QueueUrl: this.queueUrl,
      Entries: messages,
    };
    return await this.client.send(new SendMessageBatchCommand(parameters));
  }
}

export class StubMessageService implements MessageService {
  constructor(
    private readonly messageOutput?: SendMessageCommandOutput,
    private readonly batchMessageOutput?: SendMessageBatchCommandOutput,
  ) {}

  sendMessage(messageBody: object) {
    if (!this.messageOutput) return Promise.reject(new Error('No message output provided to stub'));

    logger.debug('Sending message', { messageBody });

    return Promise.resolve(this.messageOutput);
  }

  sendBatchMessage() {
    if (!this.batchMessageOutput) return Promise.reject(new Error('No batch message output provided to stub'));

    return Promise.resolve(this.batchMessageOutput);
  }
}

export class MissingQueueUrl extends Error {}
