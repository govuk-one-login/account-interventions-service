import 'vitest';

/**
 * As of 5.0.0 Vitest no longer reads custom matchers declared on the global `jest.Matchers` interface.
 * The `jest-openapi` package only augments `jest.Matchers`, so without this file TypeScript cannot resolve calls to
 * `toSatisfyApiSpec` and `toSatisfySchemaInApiSpec`, causing `@typescript-eslint/no-unsafe-call` lint errors.
 *
 * This declaration re-exposes those matchers on vitest's `Matchers` interface
 * so they are recognised by both the type checker and the linter.
 */
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<R, T> {
    toSatisfyApiSpec(): R;
    toSatisfySchemaInApiSpec(schemaName: string): R;
  }
}
