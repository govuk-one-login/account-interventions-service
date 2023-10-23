import { handler } from '../account-deletion-processor-handler';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import logger from '../../commons/logger';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { SNSEvent, SNSMessage, SNSEventRecord } from 'aws-lambda';
import { ContextExamples } from '@aws-lambda-powertools/commons';
const mockContext = ContextExamples.helloworldContext;

jest.mock('../../services/app-config-service');
jest.mock('../../commons/logger');

describe('Account Deletion Processor', () => {
  let testEvent: Partial<SNSEvent>;
  const updateItem = [
    {
      level: 'INFO',
      message: 'Sensitive info - Account hello marked as deleted',
      service: 'ais-main-jl',
      timestamp: '2023-10-19T10:33:24.378Z',
      xray_trace_id: '1-653105f3-59092ab132456943679e5b36',
    },
  ] as any;

  beforeEach(() => {
    testEvent = {
      Records: [{ Sns: { Message: JSON.stringify({ pk: 'abc' }) } as SNSMessage } as SNSEventRecord],
    };
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2023, 2, 18)));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update the item in DynamoDB and log info', async () => {
    const parameters = {
      TableName: 'table_name',
      Key: {
        pk: { S: 'abc' },
      },
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#isAccountDeleted': 'isAccountDeleted',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':isAccountDeleted': { BOOL: true },
        ':ttl': { N: '123' },
      },
      ConditionExpression: 'attribute_exists(pk)',
    };

    const ddbMock = mockClient(DynamoDBClient);
    ddbMock.on(UpdateItemCommand).resolves(updateItem);

    const loggerInfoSpy = jest.spyOn(logger, 'info');

    await handler(testEvent as SQSEvent, mockContext);

    expect(ddbMock).toHaveReceivedCommandWith(UpdateItemCommand, parameters);
    expect(loggerInfoSpy).toHaveBeenCalledWith(`Sensitive info - Account marked as deleted`);
  });
});

// it('should update the item in DynamoDB and log info', async () => {
//   const mockUpdateItemCommand = mockClient(DynamoDBClient).on(UpdateItemCommand);
//   // mockUpdateItemCommand.resolvesOnce({ pk: string })
//
//   const event = await (new handler('table_name'));
//
//   expect(event.send).toHaveBeenCalledTimes(1);
//   expect(event.send).toHaveBeenCalledWith(mockUpdateItemCommand);
// });

//
// it('should log error if DynamoDB update fails', async () => {
//   const pk = 'test-pk';
//   const maxRetentionSeconds = 60;
//   const ttl = Date.now() + maxRetentionSeconds * 1000;
//
//   mockAppConfigService.maxRetentionSeconds = maxRetentionSeconds;
//   mockAppConfigService.tableName = 'test-table-name';
//
//   const mockError = new Error('DynamoDB update failed');
//   mockDynamoDBClient.send.mockRejectedValueOnce(mockError);
