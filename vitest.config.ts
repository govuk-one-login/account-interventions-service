import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', 'src/contract-testing/**'],
    env: {
      CLOUDWATCH_METRICS_NAMESPACE: 'test_namespace',
      METRIC_SERVICE_NAME: 'test',
      TABLE_NAME: 'table_name',
      AWS_REGION: 'aws_region',
      DELETED_ACCOUNT_RETENTION_SECONDS: '12345',
      TXMA_QUEUE_URL: 'https://sqs.eu-west-2.amazonaws.com/111122223333/TxMAQueue',
      HISTORY_RETENTION_SECONDS: '63072000',
    },
  },
});
