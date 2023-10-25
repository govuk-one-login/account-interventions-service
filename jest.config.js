module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  setupFilesAfterEnv: ['jest-extended/all'],
  transformIgnorePatterns: ['node_modules/'],
};
process.env['CLOUDWATCH_METRICS_NAMESPACE'] = 'test_namespace';
process.env['METRIC_SERVICE_NAME'] = 'test';
process.env['TABLE_NAME'] = 'table_name';
process.env['AWS_REGION'] = 'aws_region';
process.env['DELETED_ACCOUNT_STATUS_RETENTION_SECONDS'] = 'deleted_account_status_retention_seconds';
