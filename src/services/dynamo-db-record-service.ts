import { z, ZodArray, ZodObject, ZodRawShape } from 'zod';
import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import TableConfig from '../tables/table-config';

type ArrayFromT<T extends ZodObject<ZodRawShape>> = z.infer<z.ZodArray<T>>;

export interface RecordService<T extends ZodObject<ZodRawShape>> {
  queryByPkAndValidate(partionKeyValue: string): Promise<ArrayFromT<T>>;
  batchWrite(input: ArrayFromT<T>): Promise<void>;
}

export class DynamoDBRecordService<
  T extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
> implements RecordService<T> {
  readonly arraySchema: ZodArray<T>;

  public constructor(
    readonly config: TableConfig<T>,
    readonly dbClient: DynamoDBDocumentClient,
  ) {
    this.arraySchema = z.array(config.schema);
  }

  async queryByPkAndValidate(partionKeyValue: string): Promise<ArrayFromT<T>> {
    const results = await this.dbClient.send(
      new QueryCommand({
        TableName: this.config.tableName,
        KeyConditionExpression: '#pk = :pk',
        ExpressionAttributeNames: { '#pk': this.config.partitionKeyName },
        ExpressionAttributeValues: { ':pk': partionKeyValue },
      }),
    );

    return this.arraySchema.parse(results.Items ?? []);
  }

  async batchWrite(input: ArrayFromT<T>): Promise<void> {
    await this.dbClient.send(
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

  queryByPkAndValidate(): Promise<ArrayFromT<T>> {
    return Promise.resolve(this.results);
  }

  batchWrite(): Promise<void> {
    return Promise.resolve();
  }
}
