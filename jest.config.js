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
process.env['DELETED_ACCOUNT_RETENTION_SECONDS'] = '12345';
process.env['TXMA_QUEUE_URL'] = 'https://sqs.eu-west-2.amazonaws.com/111122223333/TxMAQueue';
process.env['HISTORY_RETENTION_SECONDS'] = '63072000';
