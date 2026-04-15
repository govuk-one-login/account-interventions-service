import { SendMessageBatchCommand, SendMessageBatchRequestEntry, SendMessageCommand, SendMessageCommandOutput, SQSClient } from "@aws-sdk/client-sqs";

export interface QueueClient {
  send(queueUrl: string | undefined, message: string): Promise<SendMessageCommandOutput>;
  sendBatchMessage(queueUrl: string, messages: SendMessageBatchRequestEntry[]): Promise<void>;
}

export class SQSQueueClient implements QueueClient {
  private region = process.env['AWS_REGION'];
  private sqsClient = new SQSClient({ region: this.region ?? 'eu-west-2' });

  async send(queueUrl: string, message: string) {
    const response = await this.sqsClient.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: message }));
    return response;
  }
  async sendBatchMessage(queueUrl: string, messages: SendMessageBatchRequestEntry[]): Promise<void> {
    await this.sqsClient.send(new SendMessageBatchCommand({ QueueUrl : queueUrl, Entries: messages }))
  }
}

export class StubSqsClient implements QueueClient {
  private queues: Record<string, string[]> = {};
  private listeners: ((queueUrl: string, message: any) => void)[] = [];
  async send(queueUrl: string, message: string) {
    this.queues[queueUrl] ??= [];
    this.queues[queueUrl].push(message)
    return await Promise.resolve({} as SendMessageCommandOutput);
  }
  public onSend(callBack: (queueUrl: string, message: any) => void) {
    this.listeners.push(callBack);
  }
  async sendBatchMessage(queueUrl: string, messages: SendMessageBatchRequestEntry[]): Promise<void> {
    this.queues[queueUrl] ??= [];
    this.queues[queueUrl].push(...messages.map(m => m.MessageBody ?? '{}'))
    messages.forEach(message => {
      this.listeners.forEach(callBack => {
        callBack(queueUrl, { messageId: message.Id, body: message.MessageBody ?? '{}' })
      })
    })
    await Promise.resolve();
  }
  public addMessage(queueUrl: string, body: string): void {
    this.queues[queueUrl] ??= [];
    this.queues[queueUrl].push(body);
  }
  public getMessages(queueUrl: string): string[] {
    return this.queues[queueUrl] ?? [];
  }
  public reset(): void {
    this.queues = {};
  }
}
