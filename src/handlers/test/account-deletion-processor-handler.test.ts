import { handler } from '../account-deletion-processor-handler';
import { DynamoDbService as DynamoDatabaseService } from '../../services/dynamo-db-service';
import logger from '../../commons/logger';
import 'aws-sdk-client-mock-jest';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { ContextExamples } from '@aws-lambda-powertools/commons';

jest.mock('../../services/dynamo-db-service');
jest.mock('@aws-sdk/util-dynamodb');
jest.mock('../../commons/logger');

const mockDynamoDBServiceUpdateDeleteStatus = DynamoDatabaseService.prototype.updateDeleteStatus as jest.Mock;

describe('Account Deletion Processor', () => {
  let mockEvent: SQSEvent;
  let mockRecord: SQSRecord;
  const mockContext = ContextExamples.helloworldContext;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2023, 4, 30)));
  });

  beforeEach(() => {
    mockRecord = {
      messageId: '',
      receiptHandle: '',
      body: JSON.stringify({ Message: JSON.stringify({ user_id: 'hello' }) }),
      attributes: {
        ApproximateReceiveCount: '',
        SentTimestamp: '',
        SenderId: '',
        ApproximateFirstReceiveTimestamp: '',
      },
      messageAttributes: {},
      md5OfBody: '',
      eventSource: '',
      eventSourceARN: '',
      awsRegion: '',
    };
    mockEvent = { Records: [mockRecord] };
    mockDynamoDBServiceUpdateDeleteStatus.mockReturnValue(['1', '2']);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing if SQS event contains no record', async () => {
    mockDynamoDBServiceUpdateDeleteStatus.mockReturnValue([]);
    mockEvent = { Records: [] };
    const loggerErrorSpy = jest.spyOn(logger, 'error');
    await handler(mockEvent, mockContext);
    expect(loggerErrorSpy).toHaveBeenCalledWith('The event does not contain any records.');
  });

  it('does not process the SQS Record when the SQS message body is not a valid JSON', async () => {
    const mockBody = 'non-JSON mockRecordBody';
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    const loggerWarnSpy = jest.spyOn(logger, 'error');
    await handler(mockEvent, mockContext);
    expect(loggerWarnSpy).toHaveBeenCalledWith('The SQS message can not be parsed.');
  });

  it('does not process the SQS Record when the message of the message body is not a valid JSON', async () => {
    const mockBody = JSON.stringify({ Message: 'invalid JSON message in the message body' });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    const loggerWarnSpy = jest.spyOn(logger, 'error');
    await handler(mockEvent, mockContext);
    expect(loggerWarnSpy).toHaveBeenCalledWith('The SQS message can not be parsed.');
  });

  it("does not process the SQS Record when the message doesn't contain user id", async () => {
    const mockBody = JSON.stringify({ Message: JSON.stringify({}) });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    const loggerWarnSpy = jest.spyOn(logger, 'warn');
    await handler(mockEvent, mockContext);
    expect(loggerWarnSpy).toHaveBeenCalledWith('Attribute missing: user_id.');
  });

  it('does not process the SQS Record when user_id is an empty string in the SNS Event', async () => {
    const mockBody = JSON.stringify({ Message: JSON.stringify({ user_id: '' }) });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    const loggerWarnSpy = jest.spyOn(logger, 'warn');
    await handler(mockEvent, mockContext);
    expect(loggerWarnSpy).toHaveBeenCalledWith('Attribute invalid: user_id is empty.');
  });

  it('does not process the SQS Record when user_id is a string with whitespaces in the SNS Event and tests the trim function', async () => {
    const mockBody = JSON.stringify({ Message: JSON.stringify({ user_id: '   ' }) });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    const loggerWarnSpy = jest.spyOn(logger, 'warn');
    await handler(mockEvent, mockContext);
    expect(loggerWarnSpy).toHaveBeenCalledWith('Attribute invalid: user_id is empty.');
  });

  it('does not process the SQS Record when user_id is not a string', async () => {
    const mockBody = JSON.stringify({ Message: JSON.stringify({ user_id: 123 }) });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    const loggerWarnSpy = jest.spyOn(logger, 'warn');
    await handler(mockEvent, mockContext);
    expect(loggerWarnSpy).toHaveBeenCalledWith('Attribute invalid: user_id is not a string.');
  });

  it('tests the trim functionality is being used', async () => {
    mockDynamoDBServiceUpdateDeleteStatus.mockReturnValueOnce(['1']);
    const mockBody = JSON.stringify({ Message: JSON.stringify({ user_id: 'abcdef ' }) });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext);
    expect(mockDynamoDBServiceUpdateDeleteStatus).toHaveBeenCalledWith('abcdef');
  });

  it('throws an error when it fails to update the delete status', async () => {
    mockDynamoDBServiceUpdateDeleteStatus.mockRejectedValue('Error');
    const mockBody = JSON.stringify({ Message: JSON.stringify({ user_id: 'hello' }) });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    const loggerErrorSpy = jest.spyOn(logger, 'error');
    await expect (handler(mockEvent, mockContext)).rejects.toThrowError('Failed to update the account status.');
    expect(loggerErrorSpy).toHaveBeenCalledWith(`Sensitive info - Error updating account hello`, { error: 'Error' });
  });

  it('should update the status of the userId in DynamoDB and log info', async () => {
    mockDynamoDBServiceUpdateDeleteStatus.mockReturnValue(['1']);
    const loggerInfoSpy = jest.spyOn(logger, 'info');
    await handler(mockEvent, mockContext);
    expect(loggerInfoSpy).toHaveBeenCalledWith(`Sensitive info - Account hello marked as deleted`);
  });
});
