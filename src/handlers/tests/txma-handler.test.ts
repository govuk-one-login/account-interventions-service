import { Mock } from 'vitest';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { handler } from '../txma-handler';
import { sendBatchSqsMessage } from '../../services/send-sqs-message';
import { Metrics } from '@aws-lambda-powertools/metrics';

vi.mock('../../services/send-sqs-message');
vi.mock('@aws-lambda-powertools/metrics');

// eslint-disable-next-line @typescript-eslint/unbound-method
const mockSerializeMetrics = Metrics.prototype.serializeMetrics as Mock;

const mockSendBatchSqsMessage = sendBatchSqsMessage as Mock;

const createMockRecord = (eventDetails: unknown) => ({
  messageId: '',
  receiptHandle: '',
  body: JSON.stringify(eventDetails),

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
});

beforeEach(() => {
  vi.clearAllMocks();
  mockSerializeMetrics.mockReturnValue({
    _aws: { CloudWatchMetrics: [] },
  });
});

describe('TxMA Handler', () => {
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

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('Sends an SQS message to the delete queue', async () => {
    const deleteEvent = {
      event_name: 'AUTH_DELETE_ACCOUNT',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      txma: { configVersion: '1.0.4' },
    };
    mockRecord = createMockRecord(deleteEvent);
    mockEvent = { Records: [mockRecord] };

    vi.stubEnv('ACCOUNT_DELETION_SQS_QUEUE', 'delete_queue');
    vi.stubEnv('ACCOUNT_INTERVENTION_SQS_QUEUE', 'intervention_queue');
    await handler(mockEvent, mockContext);
    expect(mockSendBatchSqsMessage).toHaveBeenCalledWith(
      [
        {
          Id: '0',
          MessageBody:
            '{"event_name":"AUTH_DELETE_ACCOUNT","user":{"user_id":"urn:fdc:gov.uk:2022:USER_ONE"},"txma":{"configVersion":"1.0.4"}}',
        },
      ],
      'delete_queue',
      undefined,
    );
  });

  it('Sends an SQS message to the intervention queue', async () => {
    const otherInterventionEvent = {
      event_name: 'TICF_ACCOUNT_INTERVENTION',
      user_id: 'hello',
    };
    mockRecord = createMockRecord(otherInterventionEvent);
    mockEvent = { Records: [mockRecord] };
    vi.stubEnv('ACCOUNT_DELETION_SQS_QUEUE', 'delete_queue');
    vi.stubEnv('ACCOUNT_INTERVENTION_SQS_QUEUE', 'intervention_queue');
    await handler(mockEvent, mockContext);
    expect(mockSendBatchSqsMessage).toHaveBeenCalledWith(
      [
        {
          Id: '0',
          MessageBody: '{"event_name":"TICF_ACCOUNT_INTERVENTION","user_id":"hello"}',
        },
      ],
      'intervention_queue',
      undefined,
    );
  });

  it('Sends throw an error if delete queue not configured', async () => {
    vi.stubEnv('ACCOUNT_INTERVENTION_SQS_QUEUE', 'intervention_queue');
    try {
      await handler(mockEvent, mockContext);
    } catch (error) {
      expect((error as Error).message).toEqual('ACCOUNT_DELETION_SQS_QUEUE env variable is not set');
    }
    expect(mockSendBatchSqsMessage).not.toHaveBeenCalled();
  });

  it('Sends throw an error if intervention queue not configured', async () => {
    vi.stubEnv('ACCOUNT_DELETION_SQS_QUEUE', 'queue');
    try {
      await handler(mockEvent, mockContext);
    } catch (error) {
      expect((error as Error).message).toEqual('ACCOUNT_INTERVENTION_SQS_QUEUE env variable is not set');
    }
    expect(mockSendBatchSqsMessage).not.toHaveBeenCalled();
  });
});
