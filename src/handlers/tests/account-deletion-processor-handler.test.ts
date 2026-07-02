import { Mock } from 'vitest';
import { handler } from '../account-deletion-processor-handler';
import logger from '../../commons/logger';
import 'aws-sdk-client-mock-vitest/extend';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { MetricNames } from '../../data-types/constants';
import { InMemoryAccountStatusService } from '../../tables/account-status';

vi.mock('../../commons/logger');
vi.mock('@aws-lambda-powertools/metrics');

// eslint-disable-next-line @typescript-eslint/unbound-method
const mockPublishStoredMetric = Metrics.prototype.publishStoredMetrics as Mock;
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockAddMetric = Metrics.prototype.addMetric as Mock;
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockAddDimensions = Metrics.prototype.addDimensions as Mock;
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockSerializeMetrics = Metrics.prototype.serializeMetrics as Mock;

const loggerErrorSpy = vi.spyOn(logger, 'error');

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
    done: () => {
      console.log('Done!');
    },
    fail: () => {
      console.log('Failed!');
    },
    succeed: () => {
      console.log('Succeeded!');
    },
  };

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2023, 4, 30)).getTime());
  });

  beforeEach(() => {
    mockRecord = {
      messageId: '',
      receiptHandle: '',
      body: JSON.stringify({ event_name: 'AUTH_DELETE_ACCOUNT', user: { user_id: 'hello' } }),
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
    mockSerializeMetrics.mockReturnValue({
      _aws: { CloudWatchMetrics: [] },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('does nothing if SQS event contains no record', async () => {
    mockEvent = { Records: [] };
    await handler(mockEvent, mockContext, new InMemoryAccountStatusService());
    expect(mockPublishStoredMetric).toHaveBeenCalledTimes(0);
    expect(loggerErrorSpy).toHaveBeenCalledWith('The event does not contain any records.');
  });

  it('does not process the SQS Record when the SQS message body is not a valid JSON', async () => {
    const mockBody = 'non-JSON mockRecordBody';
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext, new InMemoryAccountStatusService());
    expect(loggerErrorSpy).toHaveBeenCalledWith('The SQS message can not be parsed.');

    expect(mockAddMetric).toHaveBeenCalledTimes(1);
    expect(mockAddMetric).toHaveBeenCalledWith(MetricNames.DELETE_EVENT_PARSER_ERROR, 'Count', 1);
    expect(mockAddDimensions).toHaveBeenCalledTimes(1);
    expect(mockAddDimensions).toHaveBeenCalledWith({ ERROR: 'BODY_JSON_PARSER_ERROR' });
    expect(mockPublishStoredMetric).toHaveBeenCalledTimes(3);
  });

  it('does not process the SQS Record when the message body is not a valid JSON', async () => {
    const mockBody = JSON.stringify({ Message: 'invalid JSON message in the message body' });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext, new InMemoryAccountStatusService());
    expect(loggerErrorSpy)
      .toHaveBeenCalledWith(`The SQS message can not be parsed. ✖ Invalid input: expected "AUTH_DELETE_ACCOUNT"
  → at event_name
✖ Invalid input: expected object, received undefined
  → at user`);
  });

  it("does not process the SQS Record when the message doesn't contain user id", async () => {
    const mockBody = JSON.stringify({ event_name: 'AUTH_DELETE_ACCOUNT' });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext, new InMemoryAccountStatusService());
    expect(loggerErrorSpy)
      .toHaveBeenCalledWith(`The SQS message can not be parsed. ✖ Invalid input: expected object, received undefined
  → at user`);
  });

  it('does not process the SQS Record when user_id is an empty string in the SNS Event', async () => {
    const mockBody = JSON.stringify({ event_name: 'AUTH_DELETE_ACCOUNT', user: { user_id: '' } });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext, new InMemoryAccountStatusService());
    expect(loggerErrorSpy)
      .toHaveBeenCalledWith(`The SQS message can not be parsed. ✖ String cannot be empty or just spaces
  → at user.user_id`);
  });

  it('does not process the SQS Record when user_id is a string with whitespaces in the SNS Event and tests the trim function', async () => {
    const mockBody = JSON.stringify({ event_name: 'AUTH_DELETE_ACCOUNT', user: { user_id: ' '.repeat(3) } });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext, new InMemoryAccountStatusService());
    expect(loggerErrorSpy)
      .toHaveBeenCalledWith(`The SQS message can not be parsed. ✖ String cannot be empty or just spaces
  → at user.user_id`);
  });

  it('does not process the SQS Record when user_id is not a string', async () => {
    const mockBody = JSON.stringify({ event_name: 'AUTH_DELETE_ACCOUNT', user: { user_id: 123 } });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext, new InMemoryAccountStatusService());
    expect(loggerErrorSpy)
      .toHaveBeenCalledWith(`The SQS message can not be parsed. ✖ Invalid input: expected string, received number
  → at user.user_id`);
  });

  it('successfully processes the message when the user id passed contains trailing spaces', async () => {
    const service = new InMemoryAccountStatusService();

    const onUpdateDeleteStatusSpy = vi.spyOn(service, 'updateDeleteStatus');

    const mockBody = JSON.stringify({
      event_name: 'AUTH_DELETE_ACCOUNT',
      user: { user_id: 'abcdef ' },
    });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext, service);
    expect(mockPublishStoredMetric).toHaveBeenCalled();
    expect(onUpdateDeleteStatusSpy).toHaveBeenCalledWith('abcdef');
  });

  it('throws an error when it fails to update the delete status', async () => {
    const mockBody = JSON.stringify({
      event_name: 'AUTH_DELETE_ACCOUNT',
      user: {
        user_id: 'hello',
      },
    });
    mockRecord = { ...mockRecord, body: mockBody };
    mockEvent = { Records: [mockRecord] };
    const error = new Error('Error');
    await expect(handler(mockEvent, mockContext, new InMemoryAccountStatusService({ error }))).rejects.toThrow(
      'Failed to update the account status.',
    );
    expect(mockPublishStoredMetric).toHaveBeenCalled();
    expect(loggerErrorSpy).toHaveBeenCalledWith(`Sensitive info - Error updating account hello`, {
      error: new Error('Error'),
    });
    expect(mockAddMetric).toHaveBeenCalled();
    expect(mockAddMetric).toHaveBeenCalledWith(MetricNames.MARK_AS_DELETED_FAILED, 'Count', 1);
  });

  it('successfully process the message when it contains a single record', async () => {
    const service = new InMemoryAccountStatusService();

    const onUpdateDeleteStatusSpy = vi.spyOn(service, 'updateDeleteStatus');

    await handler(mockEvent, mockContext, service);
    expect(mockPublishStoredMetric).toHaveBeenCalled();
    expect(onUpdateDeleteStatusSpy).toHaveBeenCalledTimes(1);
  });

  it('successfully process the message when it contains a single record, wrapped user', async () => {
    const service = new InMemoryAccountStatusService();

    const onUpdateDeleteStatusSpy = vi.spyOn(service, 'updateDeleteStatus');

    mockRecord = {
      ...mockRecord,
      body: JSON.stringify({
        event_name: 'AUTH_DELETE_ACCOUNT',
        user: { user_id: 'other_user_id' },
      }),
    };
    const mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext, service);
    expect(mockPublishStoredMetric).toHaveBeenCalled();
    expect(onUpdateDeleteStatusSpy).toHaveBeenCalledTimes(1);
  });

  it('successfully process the message when it contains a single txma message', async () => {
    const service = new InMemoryAccountStatusService();

    const onUpdateDeleteStatusSpy = vi.spyOn(service, 'updateDeleteStatus');

    mockRecord = {
      ...mockRecord,
      body: JSON.stringify({
        client_id: 'client_id',
        event_name: 'AUTH_DELETE_ACCOUNT',
        component_id: 'AUTH',
        event_id: '1234',
        event_timestamp_ms: 1722953808667,
        extensions: {
          account_deletion_reason: 'USER_INITIATED',
          phone_number_country_code: '44',
        },
        restricted: {
          device_information: {
            encoded: 'encoded_data',
          },
        },
        timestamp: 1722953808,
        user: {
          user_id: 'other_user_id',
          email: 'email',
          govuk_signin_journey_id: 'govuk_signin_journey_id',
          ip_address: '0.0.0.0',
          persistent_session_id: 'persistent_session_id',
          phone: 'phone',
          session_id: 'session_id',
        },
      }),
    };
    const mockEvent = { Records: [mockRecord] };
    await handler(mockEvent, mockContext, service);
    expect(mockPublishStoredMetric).toHaveBeenCalledTimes(1);
    expect(mockAddMetric).not.toHaveBeenCalledWith('INVALID_EVENT_RECEIVED_EVENT_CATALOGUE', 'Count', 1);
    expect(onUpdateDeleteStatusSpy).toHaveBeenCalledTimes(1);
  });

  it('successfully process the message when it contains multiple records', async () => {
    const service = new InMemoryAccountStatusService();

    const onUpdateDeleteStatusSpy = vi.spyOn(service, 'updateDeleteStatus');

    const mockRecord2 = {
      ...mockRecord,
      body: JSON.stringify({
        event_name: 'AUTH_DELETE_ACCOUNT',
        user: {
          user_id: 'other_user_id',
        },
      }),
    };
    const mockEvent = { Records: [mockRecord, mockRecord2] };
    await handler(mockEvent, mockContext, service);
    expect(mockPublishStoredMetric).toHaveBeenCalled();
    expect(onUpdateDeleteStatusSpy).toHaveBeenCalledTimes(2);
  });
});
