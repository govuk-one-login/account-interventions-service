import { z } from 'zod';
import TableConfig from '../../tables/table-config';
import { DynamoDBTtlBackfillService } from '../ttl-backfill-service';
import { BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TtlSource } from '../../data-types/constants';

const createLocalClient = () =>
  DynamoDBDocumentClient.from(
    new DynamoDBClient({
      endpoint: 'http://localhost:8000',
      region: 'eu-west-2',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    }),
  );

const schema = z.object({
  accountId: z.string(),
  createdAt: z.number(),
  ttl: z.number().optional(),
  ttlSource: z.enum(TtlSource).optional(),
});

const tableConfig: TableConfig<typeof schema> = {
  tableName: 'intervention-events',
  partitionKeyName: 'accountId',
  schema,
};

type InterventionEvent = z.infer<typeof schema>;

const putItems = async (localClient: DynamoDBDocumentClient, amount = 1) => {
  const items = []

 for (let i = 0; i < amount; ++i) {
   const number = i + 1
   const createdAt = 1500 + i * 50;
   items.push(
     {
       PutRequest: {
         Item: { accountId: `account-${number.toString()}`, createdAt },
       },
     })
 }

 // add an item with a ttl
 items.push({
   PutRequest: {
     Item: { accountId: 'account-4', createdAt: 1250, ttl: 1000 },
   },
 });

  await localClient.send(
    new BatchWriteCommand({
      RequestItems: {
        'intervention-events': items,
      },
    }),
  );
};

describe('DynamoDBTtlBackfillService (Docker)', { tags: ['dynamodb-local'] }, () => {
  let localClient: DynamoDBClient;
  beforeAll(() => {
    localClient = createLocalClient();
  });

  beforeEach(async () => {
    try {
      await localClient.send(
        new DeleteTableCommand({
          TableName: 'intervention-events',
        }),
      );
    } catch {
      // Table may not exist on first run
    }

    await localClient.send(
      new CreateTableCommand({
        TableName: 'intervention-events',
        KeySchema: [
          { AttributeName: 'accountId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'accountId', AttributeType: 'S' },
          { AttributeName: 'createdAt', AttributeType: 'N' },
        ],
        BillingMode: 'PAY_PER_REQUEST',
      }),
    );
  });

  test('scans for items missing ttl', async () => {
    const service = new DynamoDBTtlBackfillService<typeof schema>(tableConfig, localClient);
    await putItems(localClient, 3);

    const result = await service.scanEventsMissingTtl({
      windowStartMs: 1000,
      windowEndMs: 2000,
      limit: 50,
    });

    expect(result.scannedCount).toBe(4);
    const sorted = result.keys.toSorted((a, b) => a.accountId.localeCompare(b.accountId));
    expect(sorted).toEqual([
      { accountId: 'account-1', createdAt: 1500 },
      { accountId: 'account-2', createdAt: 1550 },
      { accountId: 'account-3', createdAt: 1600 },
    ]);
  });

  test('should filter between createdAt times',  async () => {
    const service = new DynamoDBTtlBackfillService<typeof schema>(tableConfig, localClient);
    await putItems(localClient, 3);

    const result = await service.scanEventsMissingTtl({
      windowStartMs: 1501,
      windowEndMs: 1551,
      limit: 50,
    });

    expect(result).toEqual({
      keys: [
        {
          accountId: 'account-2',
          createdAt: 1550,
        },
      ],
      scannedCount: 4,
    });
  });

  test('updates items that do not have a ttl', async () => {
    const service = new DynamoDBTtlBackfillService<typeof schema>(tableConfig, localClient);
    await putItems(localClient, 3);

   const itemsWithoutTtl = [
     { accountId: 'account-3', createdAt: 1600 },
     { accountId: 'account-2', createdAt: 1550 },
     { accountId: 'account-1', createdAt: 1500 },
   ];

    // update the items without ttl
    for (const item of itemsWithoutTtl) {
      await service.applyTtl(item, 1000);
    }

    // verify that all items have ttl
    const result = await localClient.send(
      new ScanCommand({
        TableName: 'intervention-events',
      }),
    );

    const items = result.Items as InterventionEvent[];

    const sorted = items.toSorted((a, b) => a.accountId.localeCompare(b.accountId));
    expect(sorted).toEqual([
      { accountId: 'account-1', createdAt: 1500, ttl: 1000, ttlSource: 'BACKFILL' },
      { accountId: 'account-2', createdAt: 1550, ttl: 1000, ttlSource: 'BACKFILL' },
      { accountId: 'account-3', createdAt: 1600, ttl: 1000, ttlSource: 'BACKFILL' },
      { accountId: 'account-4', createdAt: 1250, ttl: 1000 },
    ]);
  });

  test('should return false when applyTtl is called on an item with a ttl', async () => {
    const service = new DynamoDBTtlBackfillService<typeof schema>(tableConfig, localClient);
    await putItems(localClient, 3);
    const result = await service.applyTtl({ accountId: 'account-4', createdAt: 1250 }, 1000);
    expect(result).toEqual(false);
  });
});
