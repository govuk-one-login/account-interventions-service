import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@govuk-one-login/ais-status-sdk': path.resolve(__dirname, 'packages/ais-status-sdk/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
    },
    exclude: ['**/node_modules/**', 'src/contract-testing/**', '.stryker-tmp/**', 'src/scripts/**'],
    env: {
      CLOUDWATCH_METRICS_NAMESPACE: 'test_namespace',
      METRIC_SERVICE_NAME: 'test',
      TABLE_NAME: 'table_name',
      INTERVENTION_EVENTS_TABLE_NAME: 'intervention-events',
      AWS_REGION: 'aws_region',
      DELETED_ACCOUNT_RETENTION_SECONDS: '12345',
      TXMA_QUEUE_URL: 'https://sqs.eu-west-2.amazonaws.com/111122223333/TxMAQueue',
      HISTORY_RETENTION_SECONDS: '63072000',
      ENABLE_AIS_FRONTEND: 'true',
      ENABLE_AIS_SEND_TXMA: 'true',
    },
  },
});
