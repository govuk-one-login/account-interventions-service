import 'vitest';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<R, T> {
    toSatisfyApiSpec(): R;
    toSatisfySchemaInApiSpec(schemaName: string): R;
  }
}
