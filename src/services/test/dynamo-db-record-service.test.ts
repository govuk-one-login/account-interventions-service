import z, { ZodError } from 'zod';
import TableConfig from '../../tables/table-config';
import { DynamoDBRecordService } from '../dynamo-db-record-service';
import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-vitest/extend';

const ddbMock = mockClient(DynamoDBDocumentClient);

const schema = z.object({
  pk1: z.string(),
  isAccountDeleted: z.boolean().optional(),
});

const tableConfig: TableConfig<typeof schema> = {
  tableName: 'test-table',
  partitionKeyName: 'pk1',
  schema,
};

beforeEach(() => {
  ddbMock.reset();
});

describe('DynamoDBRecordService', () => {
  test('queryByPkAndValidate', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          pk1: 'value1',
        },
      ],
    });

    const service = new DynamoDBRecordService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);

    const response = await service.queryByPkAndValidate('key_value_1');

    expect(response).toEqual([
      {
        pk1: 'value1',
      },
    ]);

    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, {
      TableName: 'test-table',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'pk1' },
      ExpressionAttributeValues: { ':pk': 'key_value_1' },
    });
  });

  test('queryByPkAndValidate includedKeys', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          pk1: 'value1',
        },
      ],
    });

    const service = new DynamoDBRecordService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);

    const res = await service.queryByPkAndValidate('key_value_1', ['pk1']);

    expect(res).toEqual([
      {
        pk1: 'value1',
      },
    ]);

    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, {
      TableName: 'test-table',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'pk1' },
      ExpressionAttributeValues: { ':pk': 'key_value_1' },
    });
  });

  test('queryByPkAndValidate includedKeys not including otherwise required field', async () => {
    const schema2 = schema.safeExtend({
      requiredKey: z.string(),
    });

    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          pk1: 'value1',
        },
      ],
    });

    const service = new DynamoDBRecordService<typeof schema2>(
      { ...tableConfig, schema: schema2 },
      ddbMock as unknown as DynamoDBDocumentClient,
    );

    const res = await service.queryByPkAndValidate('key_value_1', ['pk1']);

    expect(res).toEqual([
      {
        pk1: 'value1',
      },
    ]);

    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, {
      TableName: 'test-table',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'pk1' },
      ExpressionAttributeValues: { ':pk': 'key_value_1' },
    });
  });

  test('queryByPkAndValidate includedKeys missing required field', async () => {
    const schema2 = schema.safeExtend({
      requiredKey: z.string(),
    });

    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          pk1: 'value1',
        },
      ],
    });

    const service = new DynamoDBRecordService<typeof schema2>(
      { ...tableConfig, schema: schema2 },
      ddbMock as unknown as DynamoDBDocumentClient,
    );

    await expect(service.queryByPkAndValidate('key_value_1', ['pk1', 'requiredKey'])).rejects.toThrow(ZodError);

    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, {
      TableName: 'test-table',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'pk1' },
      ExpressionAttributeValues: { ':pk': 'key_value_1' },
    });
  });

  test('queryByPkAndValidate empty', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });

    const service = new DynamoDBRecordService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);

    const response = await service.queryByPkAndValidate('key_value_1');

    expect(response).toEqual([]);

    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, {
      TableName: 'test-table',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'pk1' },
      ExpressionAttributeValues: { ':pk': 'key_value_1' },
    });
  });

  test('queryByPkAndValidate no Items', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: undefined,
    });

    const service = new DynamoDBRecordService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);

    const response = await service.queryByPkAndValidate('key_value_1');

    expect(response).toEqual([]);

    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, {
      TableName: 'test-table',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'pk1' },
      ExpressionAttributeValues: { ':pk': 'key_value_1' },
    });
  });

  test('getByPkAndValidate', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          pk1: 'value1',
        },
      ],
    });

    const service = new DynamoDBRecordService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);

    const res = await service.getByPkAndValidate('key_value_1');

    expect(res).toEqual({
      pk1: 'value1',
    });

    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, {
      TableName: 'test-table',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'pk1' },
      ExpressionAttributeValues: { ':pk': 'key_value_1' },
    });
  });

  test('getByPkAndValidate includedKeys', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          pk1: 'value1',
          isAccountDeleted: true,
          abc: 1234,
        },
      ],
    });

    const service = new DynamoDBRecordService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);

    const res = await service.getByPkAndValidate('key_value_1', ['pk1', 'isAccountDeleted']);

    expect(res).toEqual({
      pk1: 'value1',
      isAccountDeleted: true,
    });

    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, {
      TableName: 'test-table',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'pk1' },
      ExpressionAttributeValues: { ':pk': 'key_value_1' },
      ProjectionExpression: 'pk1,isAccountDeleted',
    });
  });

  test('getByPkAndValidate empty', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });

    const service = new DynamoDBRecordService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);

    const res = await service.getByPkAndValidate('key_value_1');

    expect(res).toEqual(undefined);

    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, {
      TableName: 'test-table',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'pk1' },
      ExpressionAttributeValues: { ':pk': 'key_value_1' },
    });
  });

  test('batchWrite', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);

    ddbMock.on(BatchWriteCommand).resolves({});

    const res = await service.batchWrite([
      {
        pk1: 'value1',
      },
    ]);

    expect(res).toEqual({});

    expect(ddbMock).toHaveReceivedCommandWith(BatchWriteCommand, {
      RequestItems: {
        'test-table': [
          {
            PutRequest: {
              Item: {
                pk1: 'value1',
              },
            },
          },
        ],
      },
    });
  });

  test('basic update', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);

    await service.update('1234', {
      isAccountDeleted: true,
    });

    expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, {
      TableName: 'test-table',
      Key: {
        pk1: '1234',
      },
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted',
      ExpressionAttributeNames: {
        '#isAccountDeleted': 'isAccountDeleted',
      },
      ExpressionAttributeValues: {
        ':isAccountDeleted': true,
      },
    });
  });

  test('update with ConditionExpression and RemoveKeys', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);

    await service.update(
      '1234',
      {
        isAccountDeleted: true,
      },
      {
        RemoveKeys: ['pk1'],
        ConditionExpression:
          'attribute_exists(pk) AND (attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false)',
        ExpressionAttributeValues: {
          ':false': false,
        },
      },
    );

    expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, {
      TableName: 'test-table',
      Key: {
        pk1: '1234',
      },
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted REMOVE pk1',
      ExpressionAttributeNames: {
        '#isAccountDeleted': 'isAccountDeleted',
      },
      ExpressionAttributeValues: {
        ':isAccountDeleted': true,
        ':false': false,
      },
      ConditionExpression:
        'attribute_exists(pk) AND (attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false)',
    });
  });

  test('update with empty object', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);

    await service.update('1234', {});

    expect(ddbMock).not.toHaveReceivedAnyCommand();
  });
});
