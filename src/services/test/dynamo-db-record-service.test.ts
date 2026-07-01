import z from 'zod';
import TableConfig from '../../tables/table-config';
import { DynamoDBRecordService } from '../dynamo-db-record-service';
import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-vitest/extend';

const ddbMock = mockClient(DynamoDBDocumentClient);

const schema = z.object({
  pk1: z.string(),
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
        },
      ],
    });

    const service = new DynamoDBRecordService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);

    const res = await service.getByPkAndValidate('key_value_1', ['pk1']);

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

    await service.batchWrite([
      {
        pk1: 'value1',
      },
    ]);

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

  test('update', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);

    await service.update('1234', {
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted',
      ExpressionAttributeNames: {
        '#isAccountDeleted': 'isAccountDeleted',
      },
      ExpressionAttributeValues: {
        ':isAccountDeleted': true,
      },
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
});
