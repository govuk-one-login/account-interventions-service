import { DynamoDatabaseService } from '../dynamo-database-service';
import 'aws-sdk-client-mock-vitest/extend';
import { mockClient } from 'aws-sdk-client-mock';
import { getCurrentTimestamp } from '../../commons/get-current-timestamp';
import logger from '../../commons/logger';
import { TooManyRecordsError } from '../../data-types/errors';
import { addMetric } from '../../commons/metrics';
import { MetricNames } from '../../data-types/constants';
import { updateAccountStateCountMetricAfterDeletion } from '../../commons/metrics-helper';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, UpdateCommandInput } from '@aws-sdk/lib-dynamodb';

vi.mock('@aws-lambda-powertools/logger');
vi.mock('../../commons/metrics');
vi.mock('../../commons/metrics-helper');
vi.mock('@smithy/node-http-handler');

const ddbMock = mockClient(DynamoDBDocumentClient);
const queryCommandMock = ddbMock.on(QueryCommand);
const updateCommandMock = ddbMock.on(UpdateCommand);

describe('Dynamo DB Service', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2023, 4, 30)).getTime());
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const items = [
    {
      blocked: false,
      suspended: false,
      reproveIdentity: false,
      resetPassword: false,
    },
  ];

  const input: Record<string, unknown> = {
    ExpressionAttributeNames: {
      '#B': 'blocked',
      '#S': 'suspended',
      '#RP': 'resetPassword',
      '#RI': 'reproveIdentity',
      '#UA': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':b': true,
      ':s': true,
      ':rp': false,
      ':ri': false,
      ':ua': getCurrentTimestamp().milliseconds.toString(),
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
      ExpressionAttributeValues: { ':id_value': 'abc' },
      ProjectionExpression:
        'blocked, suspended, resetPassword, reproveIdentity, sentAt, appliedAt, isAccountDeleted, history, intervention',
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
      ExpressionAttributeValues: { ':id_value': 'abc' },
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
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.info).toHaveBeenCalledTimes(0);
  });

  it('should throw a TooManyRecordsError error if more than one record is retrieved for one user id.', async () => {
    queryCommandMock.resolves({ Items: [{ key: { S: 'valueOne' } }, { key: { S: 'valueTwo' } }] });
    const service = new DynamoDatabaseService('table_name');
    await expect(async () => await service.getAccountStateInformation('userId')).rejects.toThrow(
      new TooManyRecordsError('DynamoDB returned more than one element.'),
    );
    expect(addMetric).toHaveBeenLastCalledWith(MetricNames.DB_QUERY_ERROR_TOO_MANY_ITEMS);
  });

  it('should throw an error if Items field is undefined in response from DynamoDB.', async () => {
    queryCommandMock.resolves({ Items: undefined });
    const service = new DynamoDatabaseService('table_name');
    await expect(async () => await service.getAccountStateInformation('userId')).rejects.toThrow(
      'DynamoDB may have failed to query, returned a null response.',
    );
    expect(addMetric).toHaveBeenLastCalledWith(MetricNames.DB_QUERY_ERROR_NO_RESPONSE);
  });

  it('should update the isAccountDeleted status of the userId in DynamoDB and log info.', async () => {
    updateCommandMock.resolves({
      $metadata: { httpStatusCode: 200 },
      Attributes: {
        resetPassword: true,
        suspended: true,
        blocked: false,
        reproveIdentity: false,
      },
    });
    const commandInput: UpdateCommandInput & Record<string, unknown> = {
      TableName: 'table_name',
      Key: { pk: 'hello' },
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted, #ttl = :ttl, #deletedAt = :deletedAt',
      ExpressionAttributeNames: {
        '#isAccountDeleted': 'isAccountDeleted',
        '#ttl': 'ttl',
        '#deletedAt': 'deletedAt',
      },
      ExpressionAttributeValues: {
        ':isAccountDeleted': true,
        ':ttl': '1685417145',
        ':false': false,
        ':deletedAt': '1685404800000',
      },
      ReturnValues: 'ALL_NEW',
      ConditionExpression:
        'attribute_exists(pk) AND (attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false)',
    };
    const dynamoDBService = new DynamoDatabaseService('table_name');
    await dynamoDBService.updateDeleteStatus('hello');
    expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, commandInput);
    expect(updateAccountStateCountMetricAfterDeletion).toHaveBeenCalledWith(false, true);
  });

  it('throws an error when it fails to update the userId status.', async () => {
    const mockedUpdateCommand = mockClient(DynamoDBDocumentClient).on(UpdateCommand);
    const error = new Error('InternalServerError');
    mockedUpdateCommand.rejectsOnce(error);
    const loggerErrorSpy = vi.spyOn(logger, 'error');
    const dynamoDBService = new DynamoDatabaseService('table_name');
    await expect(async () => await dynamoDBService.updateDeleteStatus('hello')).rejects.toThrow(
      new Error('Error was not a Conditional Check Failed Exception.', { cause: new Error('InternalServerError') }),
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith('Sensitive info - Error updating Dynamo DB.', {
      error: error,
      userId: 'hello',
    });
    expect(addMetric).toHaveBeenCalledWith('DB_UPDATE_ERROR');
  });

  it('does not throw an error and logs an info when there is a Conditional Check Exception.', async () => {
    const mockedUpdateCommand = mockClient(DynamoDBDocumentClient).on(UpdateCommand);
    class ConditionalCheckFailedException extends Error {
      override name = 'ConditionalCheckFailedException';
    }
    const error = new ConditionalCheckFailedException('test');
    mockedUpdateCommand.rejectsOnce(error);
    const loggerInfoSpy = vi.spyOn(logger, 'info');
    const dynamoDBService = new DynamoDatabaseService('table_name');
    await dynamoDBService.updateDeleteStatus('hello');
    expect(loggerInfoSpy).toHaveBeenCalledWith('Sensitive info - No intervention exists for this account.', {
      error: error,
      userId: 'hello',
    });
  });
});
