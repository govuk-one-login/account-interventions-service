import {SQSEvent, SQSRecord} from 'aws-lambda'
import {handler} from '../txma-handler'
import {sendBatchSqsMessage} from '../../services/send-sqs-message'

jest.mock('../../services/send-sqs-message')

const mockSendBatchSqsMessage = sendBatchSqsMessage as jest.Mock

const createMockRecord = (eventDetails: any) => {
  return {
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
  };
}


describe('TxMA Handler', () => {
  const OLD_ENV = process.env
  let mockEvent: SQSEvent
  let mockRecord: SQSRecord
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
  }

  beforeEach(() => {
    process.env = {...OLD_ENV}
  })

  afterEach(() => {
    process.env = OLD_ENV
    jest.clearAllMocks();
  })

  it('Sends an SQS message to the delete queue', async () => {
    let deleteEvent = {
      event_name: "AUTH_DELETE_ACCOUNT",
      user_id: "urn:fdc:gov.uk:2022:USER_ONE",
      txma: {"configVersion": "1.0.4"}
    };
    mockRecord = createMockRecord(deleteEvent);
    mockEvent = {Records: [mockRecord]};

    process.env['ACCOUNT_DELETION_SQS_QUEUE'] = 'delete_queue'
    process.env['ACCOUNT_INTERVENTION_SQS_QUEUE'] = 'intervention_queue'
    await handler(mockEvent, mockContext);
    expect(mockSendBatchSqsMessage).toHaveBeenCalledWith([{
      "Id": "0",
      "MessageBody": "{\"Message\":\"{\\\"event_name\\\":\\\"AUTH_DELETE_ACCOUNT\\\",\\\"user_id\\\":\\\"urn:fdc:gov.uk:2022:USER_ONE\\\"}\"}"
    }], 'delete_queue')
  })

  it('Sends an SQS message to the intervention queue', async () => {
    let otherInterventionEvent = {
      event_name: 'TICF_ACCOUNT_INTERVENTION',
      user_id: 'hello'
    };
    mockRecord = createMockRecord(otherInterventionEvent);
    mockEvent = {Records: [mockRecord]};
    process.env['ACCOUNT_DELETION_SQS_QUEUE'] = 'delete_queue'
    process.env['ACCOUNT_INTERVENTION_SQS_QUEUE'] = 'intervention_queue'
    await handler(mockEvent, mockContext);
    expect(mockSendBatchSqsMessage).toHaveBeenCalledWith([{
      "Id": "0",
      "MessageBody": "{\"event_name\":\"TICF_ACCOUNT_INTERVENTION\",\"user_id\":\"hello\"}"
    }], 'intervention_queue')
  })

  it('Sends throw an error if delete queue not configured', async () => {
    process.env['ACCOUNT_INTERVENTION_SQS_QUEUE'] = 'intervention_queue'
    try {
      await handler(mockEvent, mockContext);
    } catch (error) {
      expect((error as Error).message).toEqual(
        'ACCOUNT_DELETION_SQS_QUEUE env variable is not set'
      );
    }
    expect(mockSendBatchSqsMessage).not.toHaveBeenCalled;
  });

  it('Sends throw an error if intervention queue not configured', async () => {
    process.env['ACCOUNT_DELETION_SQS_QUEUE'] = 'queue'
    try {
      await handler(mockEvent, mockContext);
    } catch (error) {
      expect((error as Error).message).toEqual(
        'ACCOUNT_INTERVENTION_SQS_QUEUE env variable is not set'
      );
    }
    expect(mockSendBatchSqsMessage).not.toHaveBeenCalled;
  });
})
