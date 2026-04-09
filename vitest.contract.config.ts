import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/contract-testing/**'],
    env: {
      CLOUDWATCH_METRICS_NAMESPACE: 'test_namespace',
      METRIC_SERVICE_NAME: 'test',
      TABLE_NAME: 'table_name',
      AWS_REGION: 'aws_region',
      PROVIDER_BASE_URL: 'http://127.0.0.1',
      PROVIDER_PORT: ':8080',
    },
  },
});
