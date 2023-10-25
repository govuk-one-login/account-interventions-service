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

  const vcs = [
    {
      pk: 'urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9RGA9A4i',
      sk: 'SflKxwRJSMeKKF2QT4f_0GUcjhK',
      content: 'content',
      timestamp: '1684912310',
    },
    {
      pk: 'urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9RGA9A4i',
      sk: 'SflKxwRJSMeKKF2QT4f_13x4q7s',
      content: 'content',
      timestamp: '1684912310',
    },
    {
      pk: 'urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9RGA9A4i',
      sk: 'SflKxwRJSMeKKF2QT4f_1H3NllL',
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
    ddbMock.on(QueryCommand).resolves({ Items: vcs });
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
        ':ttl': { N: '1685417145000' },
      },
      ConditionExpression: 'attribute_exists(pk)',
    };
    const ddbMock = mockClient(DynamoDBClient);
    await dynamoDBService.updateDeleteStatus('hello');
    expect(ddbMock).toHaveReceivedCommandWith(UpdateItemCommand, commandInput);
  });
});
