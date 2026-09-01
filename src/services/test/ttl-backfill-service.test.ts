import { z } from 'zod';
import TableConfig from '../../tables/table-config';
import { DynamoDBTtlBackfillService } from '../ttl-backfill-service';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-vitest/extend';
import { TtlSource } from '../../data-types/constants';

const ddbMock = mockClient(DynamoDBDocumentClient);

const schema = z.object({
  accountId: z.string(),
  createdAt: z.number(),
  ttl: z.number().optional(),
});

const tableConfig: TableConfig<typeof schema> = {
  tableName: 'intervention-events',
  partitionKeyName: 'accountId',
  schema,
};

function buildService() {
  return new DynamoDBTtlBackfillService<typeof schema>(tableConfig, ddbMock as unknown as DynamoDBDocumentClient);
}

beforeEach(() => {
  ddbMock.reset();
});

describe('DynamoDBTtlBackfillService', () => {
  describe('scanEventsMissingTtl', () => {
    // Goal: verify the scan filters on the createdAt window and missing ttl, and returns the matching keys.
    test('scans within the window for rows without a ttl and returns their keys', async () => {
      ddbMock.on(ScanCommand).resolves({
        Items: [{ accountId: 'account-1', createdAt: 1500 }],
        ScannedCount: 5,
      });

      const result = await buildService().scanEventsMissingTtl({
        windowStartMs: 1000,
        windowEndMs: 2000,
        limit: 50,
      });

      expect(result).toEqual({
        keys: [{ accountId: 'account-1', createdAt: 1500 }],
        scannedCount: 5,
      });

      expect(ddbMock).toHaveReceivedCommandWith(ScanCommand, {
        TableName: 'intervention-events',
        Limit: 50,
        FilterExpression: '#createdAt BETWEEN :windowStart AND :windowEnd AND attribute_not_exists(#ttl)',
        ProjectionExpression: '#accountId, #createdAt',
        ExpressionAttributeNames: {
          '#accountId': 'accountId',
          '#createdAt': 'createdAt',
          '#ttl': 'ttl',
        },
        ExpressionAttributeValues: {
          ':windowStart': 1000,
          ':windowEnd': 2000,
        },
      });
    });

    // Goal: verify a LastEvaluatedKey from DynamoDB is surfaced so the caller can resume.
    test('returns the last evaluated key when more pages remain', async () => {
      ddbMock.on(ScanCommand).resolves({
        Items: [],
        ScannedCount: 3,
        LastEvaluatedKey: { accountId: 'account-9', createdAt: 1800 },
      });

      const result = await buildService().scanEventsMissingTtl({
        windowStartMs: 1000,
        windowEndMs: 2000,
        limit: 50,
      });

      expect(result.lastEvaluatedKey).toEqual({ accountId: 'account-9', createdAt: 1800 });
      expect(result.scannedCount).toBe(3);
    });

    // Goal: verify a supplied exclusiveStartKey is passed through to resume a previous run.
    test('passes the exclusive start key through when resuming', async () => {
      ddbMock.on(ScanCommand).resolves({ Items: [], ScannedCount: 0 });

      await buildService().scanEventsMissingTtl({
        windowStartMs: 1000,
        windowEndMs: 2000,
        limit: 50,
        exclusiveStartKey: { accountId: 'account-3', createdAt: 1200 },
      });

      expect(ddbMock).toHaveReceivedCommandWith(ScanCommand, {
        ExclusiveStartKey: { accountId: 'account-3', createdAt: 1200 },
      });
    });

    // Goal: verify a missing Items array and ScannedCount degrade to empty results rather than throwing.
    test('defaults to empty keys and zero scanned count when DynamoDB omits them', async () => {
      ddbMock.on(ScanCommand).resolves({});

      const result = await buildService().scanEventsMissingTtl({
        windowStartMs: 1000,
        windowEndMs: 2000,
        limit: 50,
      });

      expect(result).toEqual({ keys: [], scannedCount: 0 });
    });
  });

  describe('applyTtl', () => {
    // Goal: verify a conditional SET of ttl and ttlSource is issued and reports success.
    test('sets the ttl and backfill tag, only when no ttl exists, and returns true', async () => {
      ddbMock.on(UpdateCommand).resolves({});

      const wasUpdated = await buildService().applyTtl({ accountId: 'account-1', createdAt: 1500 }, 1893456000);

      expect(wasUpdated).toBe(true);
      expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, {
        TableName: 'intervention-events',
        Key: { accountId: 'account-1', createdAt: 1500 },
        UpdateExpression: 'SET #ttl = :ttl, #ttlSource = :ttlSource',
        ConditionExpression: 'attribute_not_exists(#ttl)',
        ExpressionAttributeNames: { '#ttl': 'ttl', '#ttlSource': 'ttlSource' },
        ExpressionAttributeValues: { ':ttl': 1893456000, ':ttlSource': TtlSource.BACKFILL },
      });
    });

    // Goal: verify a row that gained a ttl between scan and update is left alone and reported as not updated.
    test('returns false when the conditional check fails', async () => {
      ddbMock
        .on(UpdateCommand)
        .rejects(new ConditionalCheckFailedException({ $metadata: {}, message: 'conditional request failed' }));

      const wasUpdated = await buildService().applyTtl({ accountId: 'account-1', createdAt: 1500 }, 1893456000);

      expect(wasUpdated).toBe(false);
    });

    // Goal: verify unexpected errors are not swallowed.
    test('rethrows errors other than a failed condition', async () => {
      ddbMock.on(UpdateCommand).rejects(new Error('network down'));

      await expect(buildService().applyTtl({ accountId: 'account-1', createdAt: 1500 }, 1893456000)).rejects.toThrow(
        'network down',
      );
    });
  });
});
