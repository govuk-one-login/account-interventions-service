import { DynamoDBClient, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDatabaseService } from '../dynamo-database-service';
import 'aws-sdk-client-mock-jest';
import { mockClient } from 'aws-sdk-client-mock';
import { getCurrentTimestamp } from '../../commons/get-current-timestamp';
import logger from '../../commons/logger';

jest.mock('@aws-lambda-powertools/logger');
jest.mock('../../commons/metrics');
jest.mock('@smithy/node-http-handler');

describe('Dynamo DB Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const items = [
    {
      blocked: {
        BOOL: false,
      },
      suspended: {
        BOOL: false,
      },
      reproveIdentity: {
        BOOL: false,
      },
      resetPassword: {
        BOOL: false,
      },
    },
  ] as any;

  const input: Record<string, any> = {
    ExpressionAttributeNames: {
      '#B': 'blocked',
      '#S': 'suspended',
      '#RP': 'resetPassword',
      '#RI': 'reproveIdentity',
      '#UA': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':b': { BOOL: true },
      ':s': { BOOL: true },
      ':rp': { BOOL: false },
      ':ri': { BOOL: false },
      ':ua': { N: `${getCurrentTimestamp().milliseconds}` },
    },
    UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua',
  };

  it('should get all items successfully', async () => {
    const queryCommandMock = mockClient(DynamoDBClient).on(QueryCommand);
    queryCommandMock.resolves({ Items: items });

    const allItems = await new DynamoDatabaseService('abc').retrieveRecordsByUserId('abc');

    expect(allItems).toEqual({
      blocked: false,
      reproveIdentity: false,
      resetPassword: false,
      suspended: false,
    });
  });

  it('should check the parameters are being called correctly', async () => {
    const QueryCommandInput = {
      TableName: 'abc',
      KeyConditionExpression: '#pk = :id_value',
      ExpressionAttributeNames: { '#pk': 'pk', '#isAccountDeleted': 'isAccountDeleted' },
      ExpressionAttributeValues: { ':id_value': { S: 'abc' }, ':isAccountDeleted': { BOOL: false } },
      FilterExpression: 'attribute_not_exists(isAccountDeleted) OR #isAccountDeleted = :isAccountDeleted',
      ProjectionExpression: 'blocked, suspended, resetPassword, reproveIdentity',
    };
    const ddbMock = mockClient(DynamoDBClient);
    const queryCommandMock = ddbMock.on(QueryCommand);
    queryCommandMock.resolvesOnce({ Items: items });
    await new DynamoDatabaseService('abc').retrieveRecordsByUserId('abc');
    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, QueryCommandInput);
  });

  it('should return expected response if update was successful', async () => {
    const queryCommandMock = mockClient(DynamoDBClient).on(QueryCommand);
    const updateCommandMock = mockClient(DynamoDBClient).on(UpdateItemCommand);
    queryCommandMock.resolvesOnce({ Items: items });
    updateCommandMock.resolvesOnce({
      $metadata: {
        httpStatusCode: 200,
      },
    });

    await expect(new DynamoDatabaseService('abc').updateUserStatus('abc', input)).resolves.toEqual({
      $metadata: {
        httpStatusCode: 200,
      },
    });
    expect(logger.info).toHaveBeenCalledTimes(0);
  });
});
