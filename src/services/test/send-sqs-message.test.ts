// send-sqs-message.test.ts
import {sendBatchSqsMessage, sendSqsMessage} from '../send-sqs-message';
import {SQSClient, SendMessageCommand, SendMessageBatchCommand} from '@aws-sdk/client-sqs';
import logger from '../../commons/logger';

jest.mock('@aws-sdk/client-sqs');
jest.mock('../../commons/logger');

describe('sendSqsMessage', () => {
  const messageBody = 'Test message';
  const queueUrl = 'queue';

  const sendFn = jest.fn();

  beforeEach(() => {
    (SQSClient as jest.Mock).mockImplementation(() => ({
      send: sendFn
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  })

  it('throws an error if AWS_REGION environment variable is not set', async () => {
    delete process.env['AWS_REGION'];
    await expect(sendSqsMessage(messageBody, queueUrl)).rejects.toThrow('AWS_REGION environment variable not set');
    expect(logger.error).toHaveBeenCalledWith('AWS_REGION environment variable is not set');
  });

  it('sends a message successfully when AWS_REGION and parameters are set', async () => {
    process.env['AWS_REGION'] = 'eu-west-2';

    await sendSqsMessage(messageBody, queueUrl);

    expect(SQSClient).toHaveBeenCalledWith({region: 'eu-west-2'});
    expect(sendFn).toHaveBeenCalledWith(expect.any(SendMessageCommand));
  });

  it('throws an error if sending the message fails', async () => {
    process.env['AWS_REGION'] = 'eu-west-2';
    sendFn.mockImplementation(() => {
      throw Error("Failed to send message");
    });

    await expect(sendSqsMessage(messageBody, queueUrl)).rejects.toThrow('Failed to send message');
  });
});


describe('sendBatchSqsMessage', () => {
  const entry = {
    Id: 0,
    MessageBody: 'Test message'
  }
  const entries: any[] = [];
  entries.push(entry);
  const queueUrl = 'queue';

  const sendFn = jest.fn();

  beforeEach(() => {
    (SQSClient as jest.Mock).mockImplementation(() => ({
      send: sendFn
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  })

  it('throws an error if AWS_REGION environment variable is not set', async () => {
    delete process.env['AWS_REGION'];
    await expect(sendBatchSqsMessage(entries, queueUrl)).rejects.toThrow('AWS_REGION environment variable not set');
    expect(logger.error).toHaveBeenCalledWith('AWS_REGION environment variable is not set');
  });

  it('sends a message successfully when AWS_REGION and parameters are set', async () => {
    process.env['AWS_REGION'] = 'eu-west-2';

    await sendBatchSqsMessage(entries, queueUrl);

    expect(SQSClient).toHaveBeenCalledWith({region: 'eu-west-2'});
    expect(sendFn).toHaveBeenCalledWith(expect.any(SendMessageBatchCommand));
  });

  it('throws an error if sending the message fails', async () => {
    process.env['AWS_REGION'] = 'eu-west-2';
    sendFn.mockImplementation(() => {
      throw Error("Failed to send message");
    });

    await expect(sendBatchSqsMessage(entries, queueUrl)).rejects.toThrow('Failed to send message');
  });
});
