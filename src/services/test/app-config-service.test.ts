import { AppConfigService } from '../app-config-service';
import { InvalidEnvironmentVariableError } from '../../data-types/errors';
import logger from '../../commons/logger';
import { LOGS_PREFIX_INVALID_CONFIG } from '../../data-types/constants';

vi.mock('@aws-lambda-powertools/logger');

describe('AppConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should throw an error if the environment variable AWS_REGION is undefined', () => {
    vi.stubEnv('AWS_REGION', '');
    const appConfig = AppConfigService.getInstance();
    const expectedMessage = 'Invalid configuration - Environment variable AWS_REGION is not defined.';
    expect(() => appConfig.awsRegion).toThrow(new InvalidEnvironmentVariableError(expectedMessage));
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledWith(expectedMessage);
  });

  it('should throw an error if the environment variable TABLE_NAME is equal to an empty string', () => {
    vi.stubEnv('TABLE_NAME', '');
    const appConfig = AppConfigService.getInstance();
    const expectedMessage = 'Invalid configuration - Environment variable TABLE_NAME is not defined.';
    expect(() => appConfig.tableName).toThrow(new InvalidEnvironmentVariableError(expectedMessage));
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledWith(expectedMessage);
  });

  it('should throw an error if the environment variable DELETED_ACCOUNT_RETENTION_SECONDS is equal to an empty string', () => {
    vi.stubEnv('DELETED_ACCOUNT_RETENTION_SECONDS', '');
    const appConfig = AppConfigService.getInstance();
    const expectedMessage =
      'Invalid configuration - Environment variable DELETED_ACCOUNT_RETENTION_SECONDS is not defined.';
    expect(() => appConfig.maxRetentionSeconds).toThrow(new InvalidEnvironmentVariableError(expectedMessage));
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledWith(expectedMessage);
  });

  it('should return undefined if the environment variable CLOUDWATCH_METRICS_NAMESPACE is equal to an empty string', () => {
    vi.stubEnv('CLOUDWATCH_METRICS_NAMESPACE', '');
    const appConfig = AppConfigService.getInstance();
    expect(appConfig.cloudWatchMetricsWorkSpace).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.warn).toHaveBeenCalledWith('Unable to retrieve metrics config, CLOUDWATCH_METRICS_NAMESPACE not set');
  });

  it('should throw an error if the environment variable TXMA_QUEUE_URL is not a url', () => {
    vi.stubEnv('TXMA_QUEUE_URL', 'notAURL');
    const appConfig = AppConfigService.getInstance();
    const expectedMessage = `${LOGS_PREFIX_INVALID_CONFIG} Environment variable TXMA_QUEUE_URL is not a valid HTTPS URL (notAURL).`;
    expect(() => appConfig.txmaEgressQueueUrl).toThrow(new InvalidEnvironmentVariableError(expectedMessage));
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledWith(expectedMessage);
  });

  it('should return the value of all environment variables', () => {
    const appConfig = AppConfigService.getInstance();
    expect(appConfig.awsRegion).toEqual('aws_region');
    expect(appConfig.tableName).toEqual('table_name');
    expect(appConfig.cloudWatchMetricsWorkSpace).toEqual('test_namespace');
    expect(appConfig.metricServiceName).toEqual('test');
    expect(appConfig.maxRetentionSeconds).toEqual(12345);
    expect(appConfig.txmaEgressQueueUrl).toEqual('https://sqs.eu-west-2.amazonaws.com/111122223333/TxMAQueue');
    expect(appConfig.historyRetentionSeconds).toEqual(63072000);
  });

  it('should throw an error if the environmental variable is not a number', () => {
    vi.stubEnv('DELETED_ACCOUNT_RETENTION_SECONDS', 'string');
    const expectedMessage =
      'Invalid configuration - Environment variable DELETED_ACCOUNT_RETENTION_SECONDS is not a number.';
    const appConfig = AppConfigService.getInstance();
    expect(() => appConfig.maxRetentionSeconds).toThrow(new InvalidEnvironmentVariableError(expectedMessage));
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledWith(expectedMessage);
  });

  describe('getConfigObject', () => {
    it('should return an object with the requested string config values', () => {
      vi.stubEnv('TABLE_NAME', 'my-table');
      vi.stubEnv('AWS_REGION', 'eu-west-2');
      const appConfig = AppConfigService.getInstance();
      const config = appConfig.getConfigObject(['tableName', 'awsRegion']);
      expect(config).toEqual({
        tableName: 'my-table',
        awsRegion: 'eu-west-2',
      });
    });

    it('should return an object with number config values correctly parsed', () => {
      vi.stubEnv('DELETED_ACCOUNT_RETENTION_SECONDS', '86400');
      vi.stubEnv('HISTORY_RETENTION_SECONDS', '172800');
      const appConfig = AppConfigService.getInstance();
      const config = appConfig.getConfigObject(['maxRetentionSeconds', 'historyRetentionSeconds']);
      expect(config).toEqual({
        maxRetentionSeconds: 86400,
        historyRetentionSeconds: 172800,
      });
    });

    it('should return an object with url config values validated', () => {
      vi.stubEnv('TXMA_QUEUE_URL', 'https://sqs.eu-west-2.amazonaws.com/123456789/MyQueue');
      const appConfig = AppConfigService.getInstance();
      const config = appConfig.getConfigObject(['txmaEgressQueueUrl']);
      expect(config).toEqual({
        txmaEgressQueueUrl: 'https://sqs.eu-west-2.amazonaws.com/123456789/MyQueue',
      });
    });

    it('should return an object with mixed config types', () => {
      vi.stubEnv('TABLE_NAME', 'my-table');
      vi.stubEnv('DELETED_ACCOUNT_RETENTION_SECONDS', '86400');
      vi.stubEnv('TXMA_QUEUE_URL', 'https://sqs.eu-west-2.amazonaws.com/123456789/MyQueue');
      const appConfig = AppConfigService.getInstance();
      const config = appConfig.getConfigObject(['tableName', 'maxRetentionSeconds', 'txmaEgressQueueUrl']);
      expect(config).toEqual({
        tableName: 'my-table',
        maxRetentionSeconds: 86400,
        txmaEgressQueueUrl: 'https://sqs.eu-west-2.amazonaws.com/123456789/MyQueue',
      });
    });

    it('should return undefined for optional config values when env var is not set', () => {
      vi.stubEnv('METRIC_SERVICE_NAME', '');
      vi.stubEnv('TABLE_NAME', 'my-table');
      const appConfig = AppConfigService.getInstance();
      const config = appConfig.getConfigObject(['metricServiceName', 'tableName']);
      expect(config).toEqual({
        metricServiceName: undefined,
        tableName: 'my-table',
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.warn).toHaveBeenCalledWith('Unable to retrieve config, METRIC_SERVICE_NAME not set');
    });

    it('should return undefined for optional cloudWatchMetricsWorkSpace when env var is not set', () => {
      vi.stubEnv('CLOUDWATCH_METRICS_NAMESPACE', '');
      const appConfig = AppConfigService.getInstance();
      const config = appConfig.getConfigObject(['cloudWatchMetricsWorkSpace']);
      expect(config).toEqual({
        cloudWatchMetricsWorkSpace: undefined,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.warn).toHaveBeenCalledWith('Unable to retrieve config, CLOUDWATCH_METRICS_NAMESPACE not set');
    });

    it('should return optional config values when env var is set', () => {
      vi.stubEnv('METRIC_SERVICE_NAME', 'my-service');
      vi.stubEnv('CLOUDWATCH_METRICS_NAMESPACE', 'my-namespace');
      const appConfig = AppConfigService.getInstance();
      const config = appConfig.getConfigObject(['metricServiceName', 'cloudWatchMetricsWorkSpace']);
      expect(config).toEqual({
        metricServiceName: 'my-service',
        cloudWatchMetricsWorkSpace: 'my-namespace',
      });
    });

    it('should throw an error for required config values when env var is not set', () => {
      vi.stubEnv('TABLE_NAME', '');
      const appConfig = AppConfigService.getInstance();
      expect(() => appConfig.getConfigObject(['tableName'])).toThrow(InvalidEnvironmentVariableError);
    });

    it('should throw an error when a url config value is not a valid HTTPS URL', () => {
      // eslint-disable-next-line unicorn/prefer-https
      vi.stubEnv('TXMA_QUEUE_URL', 'http://not-https.com');
      const appConfig = AppConfigService.getInstance();
      expect(() => appConfig.getConfigObject(['txmaEgressQueueUrl'])).toThrow(InvalidEnvironmentVariableError);
    });

    it('should throw an error when a number config value is not a valid number', () => {
      vi.stubEnv('DELETED_ACCOUNT_RETENTION_SECONDS', 'not-a-number');
      const appConfig = AppConfigService.getInstance();
      expect(() => appConfig.getConfigObject(['maxRetentionSeconds'])).toThrow(InvalidEnvironmentVariableError);
    });
  });
});
