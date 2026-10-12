import { ZodObject, ZodRawShape } from 'zod';

interface TableConfig<T extends ZodObject<ZodRawShape>> {
  tableName: string;
  partitionKeyName: string;
  schema: T;
}

export default TableConfig;
