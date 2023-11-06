import {
  DynamoDBClient,
  QueryCommand,
  QueryCommandOutput,
  UpdateItemCommand, UpdateItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import { DynamoDatabaseService } from '../dynamo-database-service';
import 'aws-sdk-client-mock-jest';
import { mockClient } from 'aws-sdk-client-mock';
import { getCurrentTimestamp } from '../../commons/get-current-timestamp';
import logger from '../../commons/logger';
import { TooManyRecordsError } from '../../data-types/errors';
import { logAndPublishMetric } from '../../commons/metrics';
import { MetricNames } from '../../data-types/constants';

jest.mock('@aws-lambda-powertools/logger');
jest.mock('../../commons/metrics');
jest.mock('@smithy/node-http-handler');

const ddbMock = mockClient(DynamoDBClient);
const queryCommandMock = ddbMock.on(QueryCommand);
const updateCommandMock = ddbMock.on(UpdateItemCommand);

describe('Dynamo DB Service', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2023, 4, 30)));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
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
    queryCommandMock.resolves({ Items: items });
    const allItems = await new DynamoDatabaseService('abc').retrieveRecordsByUserId('abc');
    expect(allItems).toEqual({
      blocked: false,
      reproveIdentity: false,
      resetPassword: false,
      suspended: false,
    });
  });

  it('should return undefined if user has no record', async () => {
    queryCommandMock.resolves({ Items: [] });
    const allItems = await new DynamoDatabaseService('abc').retrieveRecordsByUserId('abc');
    expect(allItems).toEqual(undefined);
  });

  it('should check the parameters are being called correctly', async () => {
    const QueryCommandInput = {
      TableName: 'abc',
      KeyConditionExpression: '#pk = :id_value',
      ExpressionAttributeNames: { '#pk': 'pk' },
      ExpressionAttributeValues: { ':id_value': { S: 'abc' } },
      ProjectionExpression: 'blocked, suspended, resetPassword, reproveIdentity, isAccountDeleted',
    };
    queryCommandMock.resolvesOnce({ Items: items });
    await new DynamoDatabaseService('abc').retrieveRecordsByUserId('abc');
    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, QueryCommandInput);
  });

  it('should return expected response if update was successful', async () => {
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

  it('should throw a TooManyRecordsError error if more than one record is retrieved for one user id', async () => {
    queryCommandMock.resolves({ Items: [{ key: { S: 'valueOne' } }, { key: { S: 'valueTwo' } }] });
    const service = await new DynamoDatabaseService('table_name');
    await expect(async () => await service.retrieveRecordsByUserId('userId')).rejects.toThrow(
      new TooManyRecordsError('DynamoDB returned more than one element.'),
    );
    expect(logAndPublishMetric).toHaveBeenLastCalledWith(MetricNames.DB_QUERY_ERROR_TOO_MANY_ITEMS);
  });

  it('should throw an error if Items field is undefined in response from db', async () => {
    queryCommandMock.resolves({ Items: undefined } as unknown as QueryCommandOutput);
    const service = await new DynamoDatabaseService('table_name');
    await expect(async () => await service.retrieveRecordsByUserId('userId')).rejects.toThrow(
      new TooManyRecordsError('DynamoDB may have failed to query, returned a null response.'),
    );
    expect(logAndPublishMetric).toHaveBeenLastCalledWith(MetricNames.DB_QUERY_ERROR_NO_RESPONSE);
  });

  it('should update the isAccountDeleted status of the userId in DynamoDB and log info', async () => {
    updateCommandMock.resolves({$metadata : { httpStatusCode: 200 }});
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
    const dynamoDBService = new DynamoDatabaseService('table_name')
    await dynamoDBService.updateDeleteStatus('hello');
    expect(ddbMock).toHaveReceivedCommandWith(UpdateItemCommand, commandInput);
  });

  it('should throw an error if response of the Dynamo Client is null / undefined', async () => {
    const mockedUpdateCommand = mockClient(DynamoDBClient).on(UpdateItemCommand);
    mockedUpdateCommand.resolves(undefined as any);
    const loggerErrorSpy = jest.spyOn(logger, 'error');
    const dynamoDBService = new DynamoDatabaseService('table_name')
    await dynamoDBService.updateDeleteStatus('hello');
    expect(loggerErrorSpy).toHaveBeenCalledWith('DynamoDB may have failed to update items, returned a null response.');
    expect(logAndPublishMetric).toHaveBeenCalledWith('DB_UPDATE_ERROR');
  });
});
