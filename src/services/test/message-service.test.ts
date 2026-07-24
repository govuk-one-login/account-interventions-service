import { MissingQueueUrl, SqsMessageService, StubMessageService } from '../message-service';
import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
  SendMessageBatchRequestEntry,
} from '@aws-sdk/client-sqs';

const sendFunction = vi.fn();

vi.mock('@aws-sdk/client-sqs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-sqs')>();
  return {
    ...actual,
    SQSClient: vi.fn(function () {
      return { send: sendFunction };
    }),
  };
});

describe('MessageService', () => {
  it('throws an error if AWS_REGION environment variable is not set', () => {
    vi.stubEnv('AWS_REGION', '');

    expect(() => new SqsMessageService('QueueName')).toThrow('Environment variable AWS_REGION not found');
  });
});

describe('sendMessage', () => {
  const messageBody = { message: 'Test message' };
  const queueUrl = 'queue';

  afterEach(() => {
    sendFunction.mockReset();
  });

  it('sends a message successfully when AWS_REGION and parameters are set', async () => {
    vi.stubEnv('AWS_REGION', 'eu-west-2');
    const service = new SqsMessageService(queueUrl);

    await service.sendMessage(messageBody);

    expect(SQSClient).toHaveBeenCalledWith({ region: 'eu-west-2' });
    expect(sendFunction).toHaveBeenCalledWith(expect.any(SendMessageCommand));
    expect(sendFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { QueueUrl: queueUrl, MessageBody: '{"message":"Test message"}' },
      }),
    );
  });

  it('throws an error if sending the message fails', async () => {
    vi.stubEnv('AWS_REGION', 'eu-west-2');
    sendFunction.mockImplementation(() => {
      throw new Error('Failed to send message');
    });

    const service = new SqsMessageService(queueUrl);

    await expect(service.sendMessage(messageBody)).rejects.toThrow('Failed to send message');
  });
});

describe('sendBatchMessage', () => {
  const entry: SendMessageBatchRequestEntry = {
    Id: '0',
    MessageBody: 'Test message',
  };
  const entries: SendMessageBatchRequestEntry[] = [entry];
  const queueUrl = 'queue';

  afterEach(() => {
    sendFunction.mockReset();
  });

  it('sends a message successfully when AWS_REGION and parameters are set', async () => {
    vi.stubEnv('AWS_REGION', 'eu-west-2');
    const service = new SqsMessageService(queueUrl);

    await service.sendBatchMessage(entries);

    expect(SQSClient).toHaveBeenCalledWith({ region: 'eu-west-2' });
    expect(sendFunction).toHaveBeenCalledWith(expect.any(SendMessageBatchCommand));
    expect(sendFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { QueueUrl: queueUrl, Entries: entries },
      }),
    );
  });

  it('throws an error if sending the message fails', async () => {
    vi.stubEnv('AWS_REGION', 'eu-west-2');
    sendFunction.mockImplementation(() => {
      throw new Error('Failed to send message');
    });
    const service = new SqsMessageService(queueUrl);

    await expect(service.sendBatchMessage(entries)).rejects.toThrow('Failed to send message');
  });

  it('throws an error if no queueUrl', () => {
    vi.stubEnv('AWS_REGION', 'eu-west-2');

    expect(() => new SqsMessageService(undefined)).toThrow(MissingQueueUrl);
  });
});

describe('StubMessageService', () => {
  it('throws an error for sendMessage', async () => {
    const stubService = new StubMessageService();

    await expect(stubService.sendMessage({})).rejects.toThrow('No message output provided to stub');
  });

  it('throws an error for sendBatchMessage', async () => {
    const stubService = new StubMessageService();

    await expect(stubService.sendBatchMessage()).rejects.toThrow('No batch message output provided to stub');
  });

  it('handles sendMessage', async () => {
    const stubService = new StubMessageService({
      $metadata: {},
    });

    const result = await stubService.sendMessage({});

    expect(result).toEqual({ $metadata: {} });
  });

  it('handles sendBatchMessage', async () => {
    const stubService = new StubMessageService(
      {
        $metadata: {},
      },
      {
        Successful: [],
        Failed: [],
        $metadata: {},
      },
    );

    const result = await stubService.sendBatchMessage();

    expect(result).toEqual({
      Successful: [],
      Failed: [],
      $metadata: {},
    });
  });
});
