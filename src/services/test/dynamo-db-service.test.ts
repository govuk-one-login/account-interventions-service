import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, QueryCommand, UpdateItemCommand, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { DynamoDbService as DynamoDatabaseService } from '../dynamo-db-service';
import { logAndPublishMetric } from '../../commons/metrics';
import logger from '../../commons/logger';
import 'aws-sdk-client-mock-jest';

jest.mock('@aws-lambda-powertools/logger');
jest.mock('../../commons/metrics');
jest.mock('@smithy/node-http-handler');

describe('Dynamo DB Service', () => {
  const tableName = 'table_name';
  let dynamoDBService: DynamoDatabaseService;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2023, 4, 30)));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    dynamoDBService = new DynamoDatabaseService(tableName);
  });

  const records = [
    {
      pk: 'urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9RGA9A4i',
      content: 'content',
      timestamp: '1684912310',
    },
    {
      pk: 'urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9RGA9A4i',
      content: 'content',
      timestamp: '1684912310',
    },
    {
      pk: 'urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9RGA9A4i',
      content: 'content',
      timestamp: '1684912313',
    },
  ] as any;

  it('should check the parameters are being called correctly', async () => {
    const ddbMock = mockClient(DynamoDBClient);
    const QueryCommandInput = {
      TableName: 'abc',
      KeyConditionExpression: '#pk = :id_value',
      ExpressionAttributeNames: { '#pk': 'pk' },
      ExpressionAttributeValues: { ':id_value': { S: 'abc' } },
    };
    ddbMock.on(QueryCommand).resolves({ Items: records });
    await new DynamoDatabaseService('abc').retrieveRecordsByUserId('abc');
    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, QueryCommandInput);
  });

  it('should throw an error if response is undefined', async () => {
    const mockedQueryCommand = mockClient(DynamoDBClient).on(QueryCommand);
    // @ts-ignore
    mockedQueryCommand.resolvesOnce();
    const loggerErrorSpy = jest.spyOn(logger, 'error');
    await expect(new DynamoDatabaseService('abc').retrieveRecordsByUserId('abc')).rejects.toThrowError(
      expect.objectContaining({
        message: 'DynamoDB may have failed to query, returned a null response.',
      }),
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith('DynamoDB may have failed to query, returned a null response.');
    expect(logAndPublishMetric).toHaveBeenCalledWith('DB_QUERY_ERROR_NO_RESPONSE');
  });

  it('should throw a logger debug if non-null LEK has been received', async () => {
    const mockedQueryCommand = mockClient(DynamoDBClient).on(QueryCommand);
    //@ts-ignore
    mockedQueryCommand.resolvesOnce({
      ConsumedCapacity: {
        TableName: 'table_name',
        CapacityUnits: Number('single'),
      },
      Count: 3,
      Items: [
        {pk: {S: 'userId1'}},
        {pk: {S: 'userId1'}},
        {pk: {S: 'userId1'}}
      ],
      ScannedCount: 3,
      LastEvaluatedKey: {
        pk: {
          S: 'userId1'
        }
      }
    }).resolvesOnce({
      ConsumedCapacity: {},
      Count: 3,
      Items: [
        {pk: {S: 'userId1'}},
        {pk: {S: 'userId1'}},
        {pk: {S: 'userId1'}}
      ],
      ScannedCount: 3,
      LastEvaluatedKey: {
        pk: {
          S: 'userId1'
        }
      }
    }).resolvesOnce(
      {
        ConsumedCapacity: {},
        Count: 2,
        Items: [
          {pk: {S: 'userId1'}},
          {pk: {S: 'userId1'}},
        ],
        ScannedCount: 2,
      }
    );
    await expect((new DynamoDatabaseService('table_name')).retrieveRecordsByUserId('userId1')).resolves.toHaveLength(8);
    expect(logAndPublishMetric).toHaveBeenCalledWith('DB_QUERY_HAS_LEK');
    expect(logAndPublishMetric).toHaveBeenCalledTimes(2)
  });

  it('should update the status of the userId in DynamoDB and log info', async () => {
    const commandInput: UpdateItemCommandInput = {
      TableName: 'table_name',
      Key: { pk: { S: 'hello' } },
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#isAccountDeleted': 'isAccountDeleted',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':isAccountDeleted': { BOOL: true },
        ':ttl': { N: '1685417145' },
        ':false': { BOOL: false },
      },
      ConditionExpression: 'attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false',
    };
    const ddbMock = mockClient(DynamoDBClient);
    await dynamoDBService.updateDeleteStatus('hello');
    expect(ddbMock).toHaveReceivedCommandWith(UpdateItemCommand, commandInput);
  });
});
