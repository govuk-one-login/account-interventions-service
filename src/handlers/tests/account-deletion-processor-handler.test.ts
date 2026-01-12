import { handler } from '../account-deletion-processor-handler';
import { DynamoDatabaseService } from '../../services/dynamo-database-service';
import logger from '../../commons/logger';
import 'aws-sdk-client-mock-jest';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { MetricNames } from '../../data-types/constants';

jest.mock('../../services/dynamo-database-service');
jest.mock('@aws-sdk/util-dynamodb');
jest.mock('../../commons/logger');
jest.mock('@aws-lambda-powertools/metrics');

const mockDynamoDBServiceUpdateDeleteStatus = DynamoDatabaseService.prototype.updateDeleteStatus as jest.Mock;
const mockPublishStoredMetric = Metrics.prototype.publishStoredMetrics as jest.Mock;
const mockAddMetric = Metrics.prototype.addMetric as jest.Mock;
const loggerErrorSpy = jest.spyOn(logger, 'error');
const loggerWarnSpy = jest.spyOn(logger, 'warn');

describe('Account Deletion Processor', () => {
  let mockEvent: SQSEvent;
  let mockRecord: SQSRecord;
  const mockContext = {
    callbackWaitsForEmptyEventLoop: true,
    functionVersion: '$LATEST',
    functionName: 'foo-bar-function',
    memoryLimitInMB: '128',
    logGroupName: '/aws/lambda/foo-bar-function-123456abcdef',
    logStreamName: '2021/03/09/[$LATEST]abcdef123456abcdef123456abcdef123456',
    invokedFunctionArn: 'arn:aws:lambda:eu-west-1:123456789012:function:foo-bar-function',
    awsRequestId: 'c6af9ac6-7b61-11e6-9a41-93e812345678',
    getRemainingTimeInMillis: () => 1234,
    done: () => console.log('Done!'),
    fail: () => console.log('Failed!'),
    succeed: () => console.log('Succeeded!'),
  };

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
    await handler(mockEvent, mockContext);
    expect(mockPublishStoredMetric).toHaveBeenCalledTimes(0);
    expect(loggerErrorSpy).toHaveBeenCalledWith('The event does not contain any records.');
  });

  it('does not process the SQS Record when the SQS message body is not a valid JSON', async () => {
    const mockBody = 'non-JSON mockRecordBody';
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext);
    expect(loggerErrorSpy).toHaveBeenCalledWith('The SQS message can not be parsed.');
  });

  it('does not process the SQS Record when the message body is not a valid JSON', async () => {
    const mockBody = JSON.stringify({ Message: 'invalid JSON message in the message body' });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext);
    expect(loggerErrorSpy).toHaveBeenCalledWith('The SQS message can not be parsed.');
  });

  it("does not process the SQS Record when the message doesn't contain user id", async () => {
    const mockBody = JSON.stringify({ Message: JSON.stringify({}) });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext);
    expect(loggerWarnSpy).toHaveBeenCalledWith('Attribute missing: user_id.');
  });

  it('does not process the SQS Record when user_id is an empty string in the SNS Event', async () => {
    const mockBody = JSON.stringify({ Message: JSON.stringify({ user_id: '' }) });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext);
    expect(loggerWarnSpy).toHaveBeenCalledWith('Attribute invalid: user_id is empty.');
  });

  it('does not process the SQS Record when user_id is a string with whitespaces in the SNS Event and tests the trim function', async () => {
    const mockBody = JSON.stringify({ Message: JSON.stringify({ user_id: '   ' }) });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext);
    expect(loggerWarnSpy).toHaveBeenCalledWith('Attribute invalid: user_id is empty.');
  });

  it('does not process the SQS Record when user_id is not a string', async () => {
    const mockBody = JSON.stringify({ Message: JSON.stringify({ user_id: 123 }) });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext);
    expect(loggerWarnSpy).toHaveBeenCalledWith('Attribute invalid: user_id is not a string.');
  });

  it('it successfully process the message when the user id passed contains trailing spaces', async () => {
    mockDynamoDBServiceUpdateDeleteStatus.mockReturnValueOnce(['1']);
    const mockBody = JSON.stringify({ Message: JSON.stringify({ user_id: 'abcdef ' }) });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext);
    expect(mockPublishStoredMetric).toHaveBeenCalledTimes(1);
    expect(mockDynamoDBServiceUpdateDeleteStatus).toHaveBeenCalledWith('abcdef');
  });

  it('throws an error when it fails to update the delete status', async () => {
    mockDynamoDBServiceUpdateDeleteStatus.mockRejectedValue('Error');
    const mockBody = JSON.stringify({ Message: JSON.stringify({ user_id: 'hello' }) });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await expect(handler(mockEvent, mockContext)).rejects.toThrow('Failed to update the account status.');
    expect(mockPublishStoredMetric).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(`Sensitive info - Error updating account hello`, { error: 'Error' });
    expect(mockAddMetric).toHaveBeenCalledTimes(1);
    expect(mockAddMetric).toHaveBeenCalledWith(MetricNames.MARK_AS_DELETED_FAILED, 'Count', 1);
  });

  it('successfully process the message when it contains a single record', async () => {
    mockDynamoDBServiceUpdateDeleteStatus.mockResolvedValue('');
    await handler(mockEvent, mockContext);
    expect(mockPublishStoredMetric).toHaveBeenCalledTimes(1);
    expect(mockDynamoDBServiceUpdateDeleteStatus).toHaveBeenCalledTimes(1);
  });

  it('successfully process the message when it contains multiple records', async () => {
    mockDynamoDBServiceUpdateDeleteStatus.mockResolvedValue('');
    const mockRecord2 = {
      ...mockRecord,
      body: JSON.stringify({ Message: JSON.stringify({ user_id: 'other_user_id' }) }),
    };
    const mockEvent = { Records: [mockRecord, mockRecord2] };
    await handler(mockEvent, mockContext);
    expect(mockPublishStoredMetric).toHaveBeenCalledTimes(1);
    expect(mockDynamoDBServiceUpdateDeleteStatus).toHaveBeenCalledTimes(2);
  });

  it('will throw an error if one of multiple records fails to process', async () => {
    mockDynamoDBServiceUpdateDeleteStatus.mockResolvedValueOnce('');
    mockDynamoDBServiceUpdateDeleteStatus.mockRejectedValue('Error');
    const mockRecord2 = {
      ...mockRecord,
      body: JSON.stringify({ Message: JSON.stringify({ user_id: 'other_user_id' }) }),
    };
    const mockEvent = { Records: [mockRecord, mockRecord2] };
    await expect(handler(mockEvent, mockContext)).rejects.toThrow('Failed to update the account status.');
    expect(mockPublishStoredMetric).toHaveBeenCalledTimes(1);
    expect(mockAddMetric).toHaveBeenCalledTimes(1);
    expect(mockAddMetric).toHaveBeenCalledWith(MetricNames.MARK_AS_DELETED_FAILED, 'Count', 1);
  });
});
