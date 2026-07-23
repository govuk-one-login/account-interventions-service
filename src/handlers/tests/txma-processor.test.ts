import { Mock } from 'vitest';
import { StubMessageService } from '../../services/message-service';
import { Metrics } from '@aws-lambda-powertools/metrics';
import logger from '../../commons/logger';
import { processTxmaEvents } from '../txma-processor';

vi.mock('@aws-lambda-powertools/metrics');
vi.mock('../../commons/logger');

const loggerErrorSpy = vi.spyOn(logger, 'error');

// eslint-disable-next-line @typescript-eslint/unbound-method
const mockSerializeMetrics = Metrics.prototype.serializeMetrics as Mock;

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

    vi.stubEnv('ACCOUNT_DELETION_SQS_QUEUE', 'delete_queue');
    vi.stubEnv('ACCOUNT_INTERVENTION_SQS_QUEUE', 'intervention_queue');
    vi.stubEnv('AWS_REGION', 'eu-west-2');

    const messageService = new StubMessageService(undefined, {
      Successful: [],
      Failed: [],
      $metadata: {},
    });

    const sendBatchMessageSpy = vi.spyOn(messageService, 'sendBatchMessage');

    await processTxmaEvents(mockEvent, {
      interventionMessageService: messageService,
      deletionMessageService: messageService,
    });

    expect(sendBatchMessageSpy).toHaveBeenCalledWith([
      {
        Id: '0',
        MessageBody:
          '{"event_name":"AUTH_DELETE_ACCOUNT","user":{"user_id":"urn:fdc:gov.uk:2022:USER_ONE"},"txma":{"configVersion":"1.0.4"}}',
      },
    ]);
  });

  it('Sends an SQS message to the intervention queue', async () => {
    const otherInterventionEvent = {
      event_name: 'TICF_ACCOUNT_INTERVENTION',
      user_id: 'hello',
    };
    const mockRecord = createMockRecord(otherInterventionEvent);
    const mockEvent = { Records: [mockRecord] };
    vi.stubEnv('ACCOUNT_DELETION_SQS_QUEUE', 'delete_queue');
    vi.stubEnv('ACCOUNT_INTERVENTION_SQS_QUEUE', 'intervention_queue');

    const messageService = new StubMessageService(undefined, {
      Successful: [],
      Failed: [],
      $metadata: {},
    });

    const sendBatchMessageSpy = vi.spyOn(messageService, 'sendBatchMessage');

    await processTxmaEvents(mockEvent, {
      interventionMessageService: messageService,
      deletionMessageService: messageService,
    });

    expect(sendBatchMessageSpy).toHaveBeenCalledWith([
      {
        Id: '0',
        MessageBody: '{"event_name":"TICF_ACCOUNT_INTERVENTION","user_id":"hello"}',
      },
    ]);
  });

  it('Sends throw an error if delete queue not configured', async () => {
    vi.stubEnv('ACCOUNT_INTERVENTION_SQS_QUEUE', 'intervention_queue');

    const messageService = new StubMessageService(undefined, {
      Successful: [],
      Failed: [],
      $metadata: {},
    });

    const sendBatchMessageSpy = vi.spyOn(messageService, 'sendBatchMessage');

    try {
      await processTxmaEvents(
        { Records: [] },
        {
          interventionMessageService: messageService,
          deletionMessageService: messageService,
        },
      );
    } catch (error) {
      expect((error as Error).message).toEqual('Environment variable ACCOUNT_DELETION_SQS_QUEUE not found');
    }
    expect(sendBatchMessageSpy).not.toHaveBeenCalled();
  });

  it('Sends throw an error if intervention queue not configured', async () => {
    vi.stubEnv('ACCOUNT_DELETION_SQS_QUEUE', 'queue');

    const messageService = new StubMessageService(undefined, {
      Successful: [],
      Failed: [],
      $metadata: {},
    });

    const sendBatchMessageSpy = vi.spyOn(messageService, 'sendBatchMessage');

    try {
      await processTxmaEvents(
        { Records: [] },
        {
          interventionMessageService: messageService,
          deletionMessageService: messageService,
        },
      );
    } catch (error) {
      expect((error as Error).message).toEqual('ACCOUNT_INTERVENTION_SQS_QUEUE env variable is not set');
    }
    expect(sendBatchMessageSpy).not.toHaveBeenCalled();
  });

  it('does nothing if SQS event contains no record', async () => {
    const mockEvent = { Records: [] };
    await processTxmaEvents(mockEvent, {
      interventionMessageService: new StubMessageService(),
      deletionMessageService: new StubMessageService(),
    });
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

    const messageService = new StubMessageService(undefined, {
      Successful: [],
      Failed: [],
      $metadata: {},
    });

    await processTxmaEvents(mockEvent, {
      interventionMessageService: messageService,
      deletionMessageService: messageService,
    });
    expect(loggerErrorSpy).toHaveBeenCalledWith('The event contains an invalid record.');
  });

  it('Logs if MessageBody missing event_name', async () => {
    const mockRecord = createMockRecord({});
    const mockEvent = { Records: [mockRecord] };

    const messageService = new StubMessageService(undefined, {
      Successful: [],
      Failed: [],
      $metadata: {},
    });

    await processTxmaEvents(mockEvent, {
      interventionMessageService: messageService,
      deletionMessageService: messageService,
    });
    expect(loggerErrorSpy).toHaveBeenCalledWith('The event contains an invalid record.');
  });
});
