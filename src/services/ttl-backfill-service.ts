import { z, ZodObject, ZodRawShape } from 'zod';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import TableConfig from '../tables/table-config';
import { TtlSource } from '../data-types/constants';

/**
 * The primary key of a row in the intervention events table. `createdAt` is the sort key and is
 * stored in milliseconds, matching the value written by the intervention event persistence path.
 */
export interface InterventionEventKey {
  accountId: string;
  createdAt: number;
}

const interventionEventKeySchema = z.object({
  accountId: z.string(),
  createdAt: z.number(),
});

/**
 * Parameters describing a single windowed, paginated page of the backfill scan.
 * `windowStartMs` and `windowEndMs` bound the `createdAt` sort key (inclusive) so an operator can
 * target rows created in a specific period. `exclusiveStartKey` resumes a previous run.
 */
export interface ScanForBackfillParameters {
  windowStartMs: number;
  windowEndMs: number;
  limit: number;
  exclusiveStartKey?: InterventionEventKey;
}

/**
 * The result of scanning one page. `scannedCount` is the number of rows DynamoDB evaluated before
 * applying the filter, `keys` are the matching rows missing a TTL, and `lastEvaluatedKey` is
 * present only when more pages remain, in which case it should be fed back in to resume.
 */
export interface ScanForBackfillResult {
  keys: InterventionEventKey[];
  scannedCount: number;
  lastEvaluatedKey?: InterventionEventKey;
}

/**
 * A narrow, injectable seam over the two DynamoDB operations the backfill needs. Programming to
 * this interface (rather than the SDK client directly) lets the orchestration logic be tested with
 * an in-memory double, per ADR 005.
 */
export interface TtlBackfillService {
  /**
   * Scan one page of rows created within the window that have no `ttl` attribute.
   */
  scanEventsMissingTtl(parameters: ScanForBackfillParameters): Promise<ScanForBackfillResult>;
  /**
   * Set the TTL on a single row, tagging it as backfilled. Returns `true` if the row was updated,
   * `false` if it already had a TTL (so was left untouched).
   */
  applyTtl(key: InterventionEventKey, ttlSeconds: number): Promise<boolean>;
}

/**
 * Thin wrapper over the injected DynamoDB document client that implements the backfill operations.
 * It owns no state beyond its configuration and client, so it is testable with aws-sdk-client-mock.
 */
export class DynamoDBTtlBackfillService<
  T extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
> implements TtlBackfillService {
  public constructor(
    private readonly config: TableConfig<T>,
    private readonly databaseClient: DynamoDBDocumentClient,
  ) {}

  public async scanEventsMissingTtl(parameters: ScanForBackfillParameters): Promise<ScanForBackfillResult> {
    const response = await this.databaseClient.send(
      new ScanCommand({
        TableName: this.config.tableName,
        Limit: parameters.limit,
        FilterExpression: '#createdAt BETWEEN :windowStart AND :windowEnd AND attribute_not_exists(#ttl)',
        ProjectionExpression: '#accountId, #createdAt',
        ExpressionAttributeNames: {
          '#accountId': this.config.partitionKeyName,
          '#createdAt': 'createdAt',
          '#ttl': 'ttl',
        },
        ExpressionAttributeValues: {
          ':windowStart': parameters.windowStartMs,
          ':windowEnd': parameters.windowEndMs,
        },
        // ExclusiveStartKey is only valid when present; exactOptionalPropertyTypes forbids passing undefined.
        ...(parameters.exclusiveStartKey && { ExclusiveStartKey: parameters.exclusiveStartKey }),
      }),
    );

    const keys = z.array(interventionEventKeySchema).parse(response.Items ?? []);
    const lastEvaluatedKey = response.LastEvaluatedKey
      ? interventionEventKeySchema.parse(response.LastEvaluatedKey)
      : undefined;

    return {
      keys,
      scannedCount: response.ScannedCount ?? 0,
      ...(lastEvaluatedKey && { lastEvaluatedKey }),
    };
  }

  public async applyTtl(key: InterventionEventKey, ttlSeconds: number): Promise<boolean> {
    try {
      await this.databaseClient.send(
        new UpdateCommand({
          TableName: this.config.tableName,
          Key: {
            [this.config.partitionKeyName]: key.accountId,
            createdAt: key.createdAt,
          },
          UpdateExpression: 'SET #ttl = :ttl, #ttlSource = :ttlSource',
          ConditionExpression: 'attribute_not_exists(#ttl)',
          ExpressionAttributeNames: {
            '#ttl': 'ttl',
            '#ttlSource': 'ttlSource',
          },
          ExpressionAttributeValues: {
            ':ttl': ttlSeconds,
            ':ttlSource': TtlSource.BACKFILL,
          },
        }),
      );
      return true;
    } catch (error) {
      // A failed condition means the row gained a TTL between the scan and the update; leave it alone.
      if (error instanceof ConditionalCheckFailedException) {
        return false;
      }
      throw error;
    }
  }
}
