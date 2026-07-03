import { z, ZodArray, ZodObject, ZodRawShape } from 'zod';
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  NativeAttributeValue,
  QueryCommand,
  UpdateCommand,
  UpdateCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import TableConfig from '../tables/table-config';
import { ReturnValue } from '@aws-sdk/client-dynamodb';
import {
  generateExpressionAttributeNames,
  generateExpressionAttributeValues,
  generateUpdateExpressionClause,
} from './db-helpers';

type ArrayFromT<T extends ZodObject<ZodRawShape>> = z.infer<z.ZodArray<T>>;
type PickedArray<T extends ZodObject<ZodRawShape>, K extends keyof z.infer<T>> = Pick<z.infer<T>, K>[];

/**
 * Optional config parameters for an update call
 */
export interface UpdateConfig<T extends string> {
  /**
   * Use ReturnValues if you want to get the item attributes as they appear before or after they are successfully updated.
   */
  ReturnValues?: ReturnValue;
  /**
   * A condition that must be satisfied in order for a conditional update to succeed.
   * If booleans are used as part of the expression, they should be added to ExpressionAttributeValues
   */
  ConditionExpression?: string;
  /**
   * Keys that will be removed as part of the update command
   */
  RemoveKeys?: T[] | undefined;
  /**
   * One or more values that can be substituted in an expression.
   * These are combined with values from the update input
   * Can be used with ConditionExpression to set booleans
   */
  ExpressionAttributeValues?: Record<string, NativeAttributeValue> | undefined;
}

export interface RecordService<T extends ZodObject<ZodRawShape>> {
  /**
   * Query database for a partitionKey value
   * @param partitionKeyValue - Value for the partitionKey
   * @param includedKeys - Optionally return a subset of fields
   */
  queryByPkAndValidate(partitionKeyValue: string, includedKeys?: undefined): Promise<ArrayFromT<T>>;
  queryByPkAndValidate<K extends keyof z.infer<T>>(
    partitionKeyValue: string,
    includedKeys: K[],
  ): Promise<PickedArray<T, K>>;

  /**
   * Get the first item for a partitionKey
   * @param partitionKeyValue - Value for the partitionKey
   * @param includedKeys - Optionally return a subset of fields
   */
  getByPkAndValidate(partitionKeyValue: string, includedKeys?: undefined): Promise<z.infer<T> | undefined>;
  getByPkAndValidate<K extends keyof z.infer<T>>(
    partitionKeyValue: string,
    includedKeys: K[],
  ): Promise<Pick<z.infer<T>, K> | undefined>;

  /**
   * Batch write a number of rows in the database.
   * Note this will update if the partitionKey and sortKey match an existing row.
   * @param input - Array of objects to insert or update.
   */
  batchWrite(input: ArrayFromT<T>): Promise<void>;

  /**
   * Update a row in the database
   * @param partitionKeyValue - Value for the partition key.
   * @param input - Object containing keys and values to update
   * @param config - Optional additional config
   */
  update(
    partitionKeyValue: string,
    input: Partial<z.infer<T>>,
    config?: UpdateConfig<string & keyof z.infer<T>>,
  ): Promise<UpdateCommandOutput | undefined>;
}

export class DynamoDBRecordService<
  T extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
> implements RecordService<T> {
  public constructor(
    readonly config: TableConfig<T>,
    readonly databaseClient: DynamoDBDocumentClient,
  ) {}

  private buildArraySchema(includedKeys?: (string & keyof z.infer<T>)[]): ZodArray<ZodObject<ZodRawShape>> {
    if (includedKeys) {
      type K = (typeof includedKeys)[number];
      const mask = Object.fromEntries(includedKeys.map((k) => [k, true])) as Partial<Record<K, true>> &
        Record<never, never>;
      return z.array(this.config.schema.pick(mask));
    }
    return z.array(this.config.schema);
  }

  queryByPkAndValidate(partitionKeyValue: string, includedKeys?: undefined): Promise<ArrayFromT<T>>;
  queryByPkAndValidate<K extends string & keyof z.infer<T>>(
    partitionKeyValue: string,
    includedKeys: K[],
  ): Promise<PickedArray<T, K>>;
  async queryByPkAndValidate<K extends string & keyof z.infer<T>>(
    partitionKeyValue: string,
    includedKeys?: K[],
  ): Promise<ArrayFromT<T> | PickedArray<T, K>> {
    const results = await this.databaseClient.send(
      new QueryCommand({
        TableName: this.config.tableName,
        KeyConditionExpression: '#pk = :pk',
        ExpressionAttributeNames: { '#pk': this.config.partitionKeyName },
        ExpressionAttributeValues: { ':pk': partitionKeyValue },
        ProjectionExpression: includedKeys?.join(','),
      }),
    );

    return this.buildArraySchema(includedKeys).parse(results.Items ?? []) as ArrayFromT<T> | PickedArray<T, K>;
  }

  getByPkAndValidate(partitionKeyValue: string, includedKeys?: undefined): Promise<z.infer<T> | undefined>;
  getByPkAndValidate<K extends string & keyof z.infer<T>>(
    partitionKeyValue: string,
    includedKeys: K[],
  ): Promise<Pick<z.infer<T>, K> | undefined>;
  async getByPkAndValidate<K extends string & keyof z.infer<T>>(
    partitionKeyValue: string,
    includedKeys?: K[],
  ): Promise<z.infer<T> | Pick<z.infer<T>, K> | undefined> {
    const res = await (includedKeys
      ? this.queryByPkAndValidate(partitionKeyValue, includedKeys)
      : this.queryByPkAndValidate(partitionKeyValue));

    return res[0];
  }

  async batchWrite(input: ArrayFromT<T>): Promise<void> {
    await this.databaseClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [this.config.tableName]: input.map((item) => ({
            PutRequest: { Item: item },
          })),
        },
      }),
    );
  }

  async update(
    partitionKeyValue: string,
    input: Partial<z.infer<T>>,
    config?: UpdateConfig<string & keyof z.infer<T>>,
  ) {
    const keys = Object.keys(input);

    if (keys.length === 0) return;

    return this.databaseClient.send(
      new UpdateCommand({
        UpdateExpression: generateUpdateExpressionClause(keys, config?.RemoveKeys),
        ExpressionAttributeNames: generateExpressionAttributeNames(keys),
        ExpressionAttributeValues: {
          ...generateExpressionAttributeValues(input),
          ...config?.ExpressionAttributeValues,
        },
        TableName: this.config.tableName,
        Key: {
          [this.config.partitionKeyName]: partitionKeyValue,
        },
        ReturnValues: config?.ReturnValues,
        ConditionExpression: config?.ConditionExpression,
      }),
    );
  }
}

export class InMemoryRecordService<T extends ZodObject<ZodRawShape>> implements RecordService<T> {
  constructor(readonly results: ArrayFromT<T>) {}

  queryByPkAndValidate(partitionKeyValue: string, includedKeys?: undefined): Promise<ArrayFromT<T>>;
  queryByPkAndValidate<K extends keyof z.infer<T>>(
    partitionKeyValue: string,
    includedKeys: K[],
  ): Promise<PickedArray<T, K>>;
  queryByPkAndValidate(): Promise<ArrayFromT<T> | PickedArray<T, never>> {
    return Promise.resolve(this.results);
  }

  getByPkAndValidate(partitionKeyValue: string, includedKeys?: undefined): Promise<z.infer<T> | undefined>;
  getByPkAndValidate<K extends keyof z.infer<T>>(
    partitionKeyValue: string,
    includedKeys: K[],
  ): Promise<Pick<z.infer<T>, K> | undefined>;
  getByPkAndValidate(): Promise<z.infer<T> | Pick<z.infer<T>, never> | undefined> {
    return Promise.resolve(this.results[0]);
  }

  batchWrite() {
    return Promise.resolve();
  }

  update() {
    return Promise.resolve(undefined);
  }
}
