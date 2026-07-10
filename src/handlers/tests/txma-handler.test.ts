import { Mock } from 'vitest';
import { sendBatchSqsMessage } from '../../services/send-sqs-message';
import { Metrics } from '@aws-lambda-powertools/metrics';
import logger from '../../commons/logger';
import { processTxmaEvents } from '../txma-processor';

vi.mock('../../services/send-sqs-message');
vi.mock('@aws-lambda-powertools/metrics');
vi.mock('../../commons/logger');

const loggerErrorSpy = vi.spyOn(logger, 'error');

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

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws an error if delete queue not configured', async () => {
    vi.stubEnv('ACCOUNT_INTERVENTION_SQS_QUEUE', 'intervention_queue');
    const { handler } = await import('../txma-handler');

    await expect(handler({ Records: [] }, mockContext)).rejects.toThrow(
      'ACCOUNT_DELETION_SQS_QUEUE env variable is not set',
    );
    expect(mockSendBatchSqsMessage).not.toHaveBeenCalled();
  });

  it('throws an error if intervention queue not configured', async () => {
    vi.stubEnv('ACCOUNT_DELETION_SQS_QUEUE', 'delete_queue');
    const { handler } = await import('../txma-handler');

    await expect(handler({ Records: [] }, mockContext)).rejects.toThrow(
      'ACCOUNT_INTERVENTION_SQS_QUEUE env variable is not set',
    );
    expect(mockSendBatchSqsMessage).not.toHaveBeenCalled();
  });
});

describe('TxMA Processor', () => {

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('Sends an SQS message to the delete queue', async () => {
    const authDeleteEvent = {
      event_name: 'AUTH_DELETE_ACCOUNT',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      txma: { configVersion: '1.0.4' },
    };
    const mockRecord = createMockRecord(authDeleteEvent);
    const mockEvent = { Records: [mockRecord] };

    await processTxmaEvents(mockEvent, 'delete_queue', 'intervention_queue');
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
    const mockRecord = createMockRecord(otherInterventionEvent);
    const mockEvent = { Records: [mockRecord] };

    await processTxmaEvents(mockEvent, 'delete_queue', 'intervention_queue');
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

  it('does nothing if SQS event contains no record', async () => {
    const mockEvent = { Records: [] };
    await processTxmaEvents(mockEvent, 'delete_queue', 'intervention_queue');
    expect(loggerErrorSpy).toHaveBeenCalledWith('The event does not contain any records.');
  });

  it('Logs if invalid MessageBody', async () => {
    const mockRecord = {
      messageId: '',
      receiptHandle: '',
      body: 'abd;;;:}',

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
    const mockEvent = { Records: [mockRecord] };

    await processTxmaEvents(mockEvent, 'delete_queue', 'intervention_queue');
    expect(loggerErrorSpy).toHaveBeenCalledWith('The event contains an invalid record.');
  });

  it('Logs if MessageBody missing event_name', async () => {
    const mockRecord = createMockRecord({});
    const mockEvent = { Records: [mockRecord] };

    await processTxmaEvents(mockEvent, 'delete_queue', 'intervention_queue');
    expect(loggerErrorSpy).toHaveBeenCalledWith('The event contains an invalid record.');
  });
});
