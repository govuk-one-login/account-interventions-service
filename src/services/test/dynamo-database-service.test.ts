import {
  DynamoDBClient,
  QueryCommand,
  QueryCommandOutput,
  UpdateItemCommand,
  UpdateItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import { DynamoDatabaseService } from '../dynamo-database-service';
import 'aws-sdk-client-mock-jest';
import { mockClient } from 'aws-sdk-client-mock';
import { getCurrentTimestamp } from '../../commons/get-current-timestamp';
import logger from '../../commons/logger';
import { TooManyRecordsError } from '../../data-types/errors';
import { logAndPublishMetric } from '../../commons/metrics';
import { MetricNames } from '../../data-types/constants';
import { updateAccountStateCountMetricAfterDeletion } from '../../commons/update-account-state-metrics';

jest.mock('@aws-lambda-powertools/logger');
jest.mock('../../commons/metrics');
jest.mock('../../commons/update-account-state-metrics');
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

  it('should get all items successfully.', async () => {
    queryCommandMock.resolves({ Items: items });
    const allItems = await new DynamoDatabaseService('abc').getAccountStateInformation('abc');
    expect(allItems).toEqual({
      blocked: false,
      reproveIdentity: false,
      resetPassword: false,
      suspended: false,
    });
  });

  it('should return undefined if a user has no record.', async () => {
    queryCommandMock.resolves({ Items: [] });
    const allItems = await new DynamoDatabaseService('abc').getAccountStateInformation('abc');
    expect(allItems).toEqual(undefined);
  });

  it('should check the parameters are being called correctly.', async () => {
    const QueryCommandInput = {
      TableName: 'abc',
      KeyConditionExpression: '#pk = :id_value',
      ExpressionAttributeNames: { '#pk': 'pk' },
      ExpressionAttributeValues: { ':id_value': { S: 'abc' } },
      ProjectionExpression: 'blocked, suspended, resetPassword, reproveIdentity, sentAt, appliedAt, isAccountDeleted',
    };
    queryCommandMock.resolvesOnce({ Items: items });
    await new DynamoDatabaseService('abc').getAccountStateInformation('abc');
    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, QueryCommandInput);
  });

  it('should check that the query of the full record is being called correctly.', async () => {
    const QueryCommandInput = {
      TableName: 'abc',
      KeyConditionExpression: '#pk = :id_value',
      ExpressionAttributeNames: { '#pk': 'pk' },
      ExpressionAttributeValues: { ':id_value': { S: 'abc' } },
    };
    queryCommandMock.resolvesOnce({ Items: items });
    await new DynamoDatabaseService('abc').getFullAccountInformation('abc');
    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, QueryCommandInput);
  });

  it('should return expected response if update was successful.', async () => {
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

  it('should throw a TooManyRecordsError error if more than one record is retrieved for one user id.', async () => {
    queryCommandMock.resolves({ Items: [{ key: { S: 'valueOne' } }, { key: { S: 'valueTwo' } }] });
    const service = await new DynamoDatabaseService('table_name');
    await expect(async () => await service.getAccountStateInformation('userId')).rejects.toThrow(
      new TooManyRecordsError('DynamoDB returned more than one element.'),
    );
    expect(logAndPublishMetric).toHaveBeenLastCalledWith(MetricNames.DB_QUERY_ERROR_TOO_MANY_ITEMS);
  });

  it('should throw an error if Items field is undefined in response from DynamoDB.', async () => {
    queryCommandMock.resolves({ Items: undefined } as unknown as QueryCommandOutput);
    const service = await new DynamoDatabaseService('table_name');
    await expect(async () => await service.getAccountStateInformation('userId')).rejects.toThrow(
      new TooManyRecordsError('DynamoDB may have failed to query, returned a null response.'),
    );
    expect(logAndPublishMetric).toHaveBeenLastCalledWith(MetricNames.DB_QUERY_ERROR_NO_RESPONSE);
  });

  it('should update the isAccountDeleted status of the userId in DynamoDB and log info.', async () => {
    updateCommandMock.resolves({
      $metadata: { httpStatusCode: 200 },
      Attributes: {
        resetPassword: {
          BOOL: true,
        },
        suspended: {
          BOOL: true,
        },
        blocked: {
          BOOL: false,
        },
        reproveIdentity: {
          BOOL: false,
        },
      },
    });
    const commandInput: UpdateItemCommandInput = {
      TableName: 'table_name',
      Key: { pk: { S: 'hello' } },
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted, #ttl = :ttl, #deletedAt = :deletedAt',
      ExpressionAttributeNames: {
        '#isAccountDeleted': 'isAccountDeleted',
        '#ttl': 'ttl',
        '#deletedAt': 'deletedAt',
      },
      ExpressionAttributeValues: {
        ':isAccountDeleted': { BOOL: true },
        ':ttl': { N: '1685417145' },
        ':false': { BOOL: false },
        ':deletedAt': { N: '1685404800000' }
      },
      ReturnValues: 'ALL_NEW',
      ConditionExpression:
        'attribute_exists(pk) AND (attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false)',
    };
    const dynamoDBService = new DynamoDatabaseService('table_name');
    await dynamoDBService.updateDeleteStatus('hello');
    expect(ddbMock).toHaveReceivedCommandWith(UpdateItemCommand, commandInput);
    expect(updateAccountStateCountMetricAfterDeletion).toHaveBeenCalledWith(false, true);
  });

  it('throws an error when it fails to update the userId status.', async () => {
    const mockedUpdateCommand = mockClient(DynamoDBClient).on(UpdateItemCommand);
    const error = new Error('InternalServerError');
    mockedUpdateCommand.rejectsOnce(error);
    const loggerErrorSpy = jest.spyOn(logger, 'error');
    const dynamoDBService = new DynamoDatabaseService('table_name');
    await expect(async () => await dynamoDBService.updateDeleteStatus('hello')).rejects.toThrow(
      new Error('Error was not a Conditional Check Failed Exception.'),
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith('Sensitive info - Error updating Dynamo DB.', {
      error: error,
      userId: 'hello',
    });
    expect(logAndPublishMetric).toHaveBeenCalledWith('DB_UPDATE_ERROR');
  });

  it('does not throw an error and logs an info when there is a Conditional Check Exception.', async () => {
    const mockedUpdateCommand = mockClient(DynamoDBClient).on(UpdateItemCommand);
    const error = new Error();
    error.name = 'ConditionalCheckFailedException';
    mockedUpdateCommand.rejectsOnce(error);
    const loggerInfoSpy = jest.spyOn(logger, 'info');
    const dynamoDBService = new DynamoDatabaseService('table_name');
    await dynamoDBService.updateDeleteStatus('hello');
    expect(loggerInfoSpy).toHaveBeenCalledWith('Sensitive info - No intervention exists for this account.', {
      error: error,
      userId: 'hello',
    });
  });
});
