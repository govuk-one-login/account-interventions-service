import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@govuk-one-login/ais-status-sdk': path.resolve(__dirname, 'packages/ais-status-sdk/src/index.mts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // `dynamodb-local` tests are skipped by default so normal runs (test:unit,
    // watch, snapshot updates, bare `vitest`) don't try to hit DynamoDB on
    // localhost:8000. They are run via `npm run test:unit:dynamodb-local`, which
    // uses vitest.dynamodb.config.mts to override skip. (`--tags-filter` selects
    // tagged tests but does not un-skip them, so the override config is required.)
    tags: [
      {
        name: 'dynamodb-local',
        description: 'Tests that require a local DynamoDB instance.',
        skip: true,
      },
    ],
    coverage: {
      provider: 'v8',
      // Specify that all typescript files are included, so the coverage report always includes
      // all of them. Without this `v8 ignore file` doesn't work for Sonar coverage checking as
      // Sonar knows a file exists, but with this that file will show as all zeroes on the coverage
      // report which Sonar evaluates as above the threshold.
      include: ['src/**/*.ts'],
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
    },
    exclude: [
      '**/node_modules/**',
      'src/contract-testing/**',
      '.stryker-tmp/**',
      'src/scripts/**',
      'packages/ais-status-sdk/integration-tests/**',
      'feature-tests-ui/.features-gen/tests/features/**',
    ],
    env: {
      CLOUDWATCH_METRICS_NAMESPACE: 'test_namespace',
      METRIC_SERVICE_NAME: 'test',
      TABLE_NAME: 'table_name',
      INTERVENTION_EVENTS_TABLE_NAME: 'intervention-events',
      AWS_REGION: 'aws_region',
      DELETED_ACCOUNT_RETENTION_SECONDS: '12345',
      HISTORY_RETENTION_SECONDS: '63072000',
    },
  },
});
