import { z, ZodArray, ZodObject, ZodRawShape } from 'zod';
import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import TableConfig from '../tables/table-config';

type ArrayFromT<T extends ZodObject<ZodRawShape>> = z.infer<z.ZodArray<T>>;
type PickedArray<T extends ZodObject<ZodRawShape>, K extends keyof z.infer<T>> = Pick<z.infer<T>, K>[];

export interface RecordService<T extends ZodObject<ZodRawShape>> {
  queryByPkAndValidate(partitionKeyValue: string, includedKeys?: undefined): Promise<ArrayFromT<T>>;
  queryByPkAndValidate<K extends keyof z.infer<T>>(
    partitionKeyValue: string,
    includedKeys: K[],
  ): Promise<PickedArray<T, K>>;
  batchWrite(input: ArrayFromT<T>): Promise<void>;
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

  batchWrite(): Promise<void> {
    return Promise.resolve();
  }
}
