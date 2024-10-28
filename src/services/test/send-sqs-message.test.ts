// send-sqs-message.test.ts
import { sendSqsMessage } from '../send-sqs-message';
import { SQSClient, SendMessageCommand, SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import logger from '../../commons/logger';

jest.mock('@aws-sdk/client-sqs');
jest.mock('../commons/logger');

describe('sendSqsMessage', () => {
  const messageBody = 'Test message';
  const queueUrl = 'queue';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws an error if AWS_REGION environment variable is not set', async () => {
    delete process.env['AWS_REGION'];
    await expect(sendSqsMessage(messageBody, queueUrl)).rejects.toThrow('AWS_REGION environment variable not set');
    expect(logger.error).toHaveBeenCalledWith('AWS_REGION environment variable is not set');
  });

  it('sends a message successfully when AWS_REGION and parameters are set', async () => {
    process.env['AWS_REGION'] = 'eu-west-2';

    const mockSendMessageOutput: SendMessageCommandOutput = {
      MessageId: '12345',
      $metadata: { httpStatusCode: 200 }
    };

    (SQSClient as jest.Mock).mockImplementation(() => ({
      send: jest.fn().mockResolvedValue(mockSendMessageOutput),
    }));

    const result = await sendSqsMessage(messageBody, queueUrl);

    expect(result).toEqual(mockSendMessageOutput);
    expect(SQSClient).toHaveBeenCalledWith({ region: 'us-east-1' });
    expect(SQSClient.prototype.send).toHaveBeenCalledWith(expect.any(SendMessageCommand));
  });

  it('logs an error if sending the message fails', async () => {
    process.env['AWS_REGION'] = 'eu-west-2';
    const error = new Error('Failed to send message');

    (SQSClient as jest.Mock).mockImplementation(() => ({
      send: jest.fn().mockRejectedValue(error),
    }));

    await expect(sendSqsMessage(messageBody, queueUrl)).rejects.toThrow('Failed to send message');
    expect(logger.error).toHaveBeenCalledWith('Error sending message to SQS:', error);
  });
});
