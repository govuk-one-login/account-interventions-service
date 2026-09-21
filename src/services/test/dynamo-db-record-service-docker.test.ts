import z from 'zod';
import TableConfig from '../../tables/table-config';
import { DynamoDBRecordService } from '../dynamo-db-record-service';
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import 'aws-sdk-client-mock-vitest/extend';

const isDynamoDbLocal = () => process.env['TEST_DYNAMODB_LOCAL'] === 'true';


const createLocalClient = () => DynamoDBDocumentClient.from(
    new DynamoDBClient({
      endpoint: 'http://localhost:8000',
      region: 'eu-west-2',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    }),
  )

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

describe.skipIf(!isDynamoDbLocal())('DynamoDBRecordService (Docker)', { tags: ['dynamodb-local'] }, () => {

  let localClient: DynamoDBClient;
  beforeAll(() => {
    localClient = createLocalClient();
  })

  beforeEach(async () => {
    try {
      await localClient.send(
        new DeleteTableCommand({
          TableName: 'test-table',
        }),
      );
    } catch {
      // Table may not exist on first run
    }

    await localClient.send(
      new CreateTableCommand({
        TableName: 'test-table',
        KeySchema: [{ AttributeName: 'pk1', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'pk1', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST',
      }),
    );
  })

  test('queryByPkAndValidate', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, localClient);
    await service.batchWrite([
      {
        pk1: 'value1',
      },
    ]);

    const response = await service.queryByPkAndValidate('value1');

    expect(response).toEqual([
      {
        pk1: 'value1',
      },
    ]);
  });

  test('queryByPkAndValidate includedKeys when no matching items', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, localClient);

    await service.batchWrite([
      {
        pk1: 'value1',
      },
    ]);

    const response = await service.queryByPkAndValidate('value1', ['isAccountDeleted']);

    expect(response).toEqual([{}]);
  });

  test('queryByPkAndValidate includedKeys with matching items', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, localClient);

    await service.batchWrite([
      {
        pk1: 'value1',
        isAccountDeleted: false,
        resetPasswordAt: '1000',
      },
    ]);

    const response = await service.queryByPkAndValidate('value1', ['isAccountDeleted']);

    expect(response).toEqual([
      {
        isAccountDeleted: false
      },
    ]);
  });

  test('queryByPkAndValidate when no matching pk', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, localClient);
    const response = await service.queryByPkAndValidate('value1', ['isAccountDeleted']);

    expect(response).toEqual([]);
  });

  test('batchWrite', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, localClient);

    const res = await service.batchWrite([
      {
        pk1: 'value1',
      },
    ]);

    // test the return result from the dynamodb
    expect(res.$metadata.httpStatusCode).toBe(200);
    const results = await service.queryByPkAndValidate('value1');
    expect(results).toEqual([{ pk1: 'value1' }]);
  });

  test('basic update', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, localClient);

    // we need to add the item in
    // consider adding this via the getTestClient as we create the table?
    await service.batchWrite([
      {
        pk1: '1234',
      },
    ]);

    await service.update('1234', {
      isAccountDeleted: true,
    });

    const results = await service.queryByPkAndValidate('1234');
    expect(results).toEqual([{ pk1: '1234', isAccountDeleted: true }]);
  });

  // note the attempt to delete the primary key is an invalid operation in DynamoDB
  // you need to delete the entire item
  // running this test through the dynamodb-local docker image throws an error
  // added an extra key to the schema resetPasswordAt to remove instead of the pk
  test('update with ConditionExpression ReturnValues', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, localClient);

    await service.batchWrite([
      {
        pk1: '1234',
        resetPasswordAt: '1000',
      },
    ]);
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
        ReturnValues: 'ALL_NEW',
      },
    );

    const results = await service.queryByPkAndValidate('1234');
    expect(results).toEqual([{ pk1: '1234', isAccountDeleted: true }]);
  });

  test('update with something ', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, localClient);

    await service.batchWrite([
      {
        pk1: '1234',
        resetPasswordAt: '1000',
      },
    ]);



  });

  test('getByPkAndValidate', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, localClient);
    await service.batchWrite([
      {
        pk1: '1234',
        resetPasswordAt: '1000',
      },
    ]);
    const results = await service.getByPkAndValidate('1234');
    expect(results).toEqual(
      {
        pk1: '1234',
        resetPasswordAt: '1000',
      },
    );
  });

  test('getByPkAndValidate with includedKeys', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, localClient);
    await service.batchWrite([
      {
        pk1: '1234',
        resetPasswordAt: '1000',
      },
    ]);
    const results = await service.getByPkAndValidate('1234', ['resetPasswordAt']);
    expect(results).toEqual(
      {
        resetPasswordAt: '1000',
      },
    );
  });

  test('getByPkAndValidate when no matching item', async () => {
    const service = new DynamoDBRecordService<typeof schema>(tableConfig, localClient);
    const results = await service.getByPkAndValidate('1234');
    expect(results).toEqual(undefined);
  });
});
