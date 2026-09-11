import z, { ZodError } from 'zod';
import TableConfig from '../../tables/table-config';
import { DynamoDBRecordService } from '../dynamo-db-record-service';
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-vitest/extend';


const ddbMock = mockClient(DynamoDBDocumentClient);


const isDynamoDbLocal = () => process.env['TEST_DYNAMODB_LOCAL'] === 'true';

const createLocalClient = async () => {

  ddbMock.restore();

  const localClient =
    DynamoDBDocumentClient.from(
      new DynamoDBClient({
        endpoint: 'http://localhost:8000',
        region: 'eu-west-2',
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      }),
    );

  try {
    await localClient.send(
      new CreateTableCommand({
        TableName: 'test-table',
        KeySchema: [{ AttributeName: 'pk1', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'pk1', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST',
      }),
    );
    console.log('Table created');
  } catch (error) {
    console.log('Table creation error:', error);
  }

  return localClient;
}


const localClient = isDynamoDbLocal() && (await createLocalClient());

function getTestClient() {
  if (isDynamoDbLocal()) {
    return localClient;
  }
  return ddbMock;
}

const schema = z.object({
  pk1: z.string(),
  isAccountDeleted: z.boolean().optional(),
  resetPasswordAt: z.string().optional(),
});

const tableConfig: TableConfig<typeof schema> = {
  tableName: 'test-table',
  partitionKeyName: 'pk1',
  schema,
};

beforeEach(() => {
  if (!isDynamoDbLocal()) {
    ddbMock.reset();
  }
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

  test('@dynamodb-local: batchWrite', async () => {
    const client = getTestClient();
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, client as unknown as DynamoDBDocumentClient);

    if (isDynamoDbLocal()) {
      ddbMock.on(BatchWriteCommand).resolves({});
    }

    const res = await service.batchWrite([
      {
        pk1: 'value1',
      },
    ]);

    if (isDynamoDbLocal()) {
      expect(res).toEqual({});
      expect(ddbMock).toHaveReceivedCommandWith(BatchWriteCommand, {
        RequestItems: {
          'test-table': [
            {
              PutRequest: {
                Item: { pk1: 'value1' },
              },
            },
          ],
        },
      });
    }

    // test the return result from the dynamodb
    if (isDynamoDbLocal()) {
      expect(res.$metadata.httpStatusCode).toBe(200);
      const results = await service.queryByPkAndValidate('value1');
      expect(results).toEqual([{ pk1: 'value1' }]);
    }
  });

  test('@dynamodb-local: basic update', async () => {
    const client = getTestClient();

    const service = new DynamoDBRecordService<typeof schema>(tableConfig, client as unknown as DynamoDBDocumentClient);

    // we need to add the item in
    // consider adding this via the getTestClient as we create the table?
    if (isDynamoDbLocal()) {
      await service.batchWrite([
        {
          pk1: '1234',
        },
      ]);
    }
    await service.update('1234', {
      isAccountDeleted: true,
    });

    if (!isDynamoDbLocal()) {
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
    }

    if (isDynamoDbLocal()) {
      const results = await service.queryByPkAndValidate('1234');
      expect(results).toEqual([{ pk1: '1234', isAccountDeleted: true }]);
    }
  });

  // note the attempt to delete the primary key is an invalid operation in DynamoDB
  // you need to delete the entire item
  // running this test through the dynamodb-local docker image throws an error
  // added an extra key to the schema resetPasswordAt to remove instead of the pk
  test('@dynamodb-local: update with ConditionExpression and RemoveKeys', async () => {
    const client = getTestClient();
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, client as unknown as DynamoDBDocumentClient);

    if (isDynamoDbLocal()) {
      await service.batchWrite([
        {
          pk1: '1234',
          resetPasswordAt: '1000',
        },
      ]);
    }

    await service.update(
      '1234',
      {
        isAccountDeleted: true,
      },
      {
        RemoveKeys: ['resetPasswordAt'],
        ConditionExpression:
          'attribute_exists(pk1) AND (attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false)',
        ExpressionAttributeValues: {
          ':false': false,
        },
      },
    );

    if (!isDynamoDbLocal()) {
      expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, {
        TableName: 'test-table',
        Key: {
          pk1: '1234',
        },
        UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted REMOVE resetPasswordAt',
        ExpressionAttributeNames: {
          '#isAccountDeleted': 'isAccountDeleted',
        },
        ExpressionAttributeValues: {
          ':isAccountDeleted': true,
          ':false': false,
        },
        ConditionExpression:
          'attribute_exists(pk1) AND (attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false)',
      });
    }

    if (isDynamoDbLocal()) {
      const results = await service.queryByPkAndValidate('1234');
      expect(results).toEqual([{ pk1: '1234', isAccountDeleted: true }]);
    }
  });

  // do not add to @dynamodb-local as it will never reach the actual database
  test('update with empty object', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);

    await service.update('1234', {});

    expect(ddbMock).not.toHaveReceivedAnyCommand();
  });
});
