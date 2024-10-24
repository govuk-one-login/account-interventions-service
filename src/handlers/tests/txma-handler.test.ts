import { SQSEvent, SQSRecord } from 'aws-lambda'
import { handler } from '../txma-handler'
import { sendSqsMessage } from '../../services/send-sqs-message'

jest.mock('../../services/send-sqs-message')

const mockSendSqsMessage = sendSqsMessage as jest.Mock

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
        process.env = { ...OLD_ENV }
        mockRecord = {
            messageId: '',
            receiptHandle: '',
            body: JSON.stringify({
                event_name: 'AUTH_DELETE_ACCOUNT',
                user_id: 'hello'
            }),
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
    })

    afterEach(() => {
        process.env = OLD_ENV
        jest.clearAllMocks();
    })

    it.only('Sends an SQS message to the delete queue', async () => {
        process.env['ACCOUNT_DELETION_SQS_QUEUE'] = 'queue'
        await handler(mockEvent, mockContext);
        expect(mockSendSqsMessage).toHaveBeenCalledWith('{\"Message\":\"{\\\"event_name\\\":\\\"AUTH_DELETE_ACCOUNT\\\",\\\"user_id\\\":\\\"hello\\\"}\"}', 'queue')
    })
})
