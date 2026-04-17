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

  it('should throw an error if the environment variable CLOUDWATCH_METRICS_NAMESPACE is equal to an empty string', () => {
    vi.stubEnv('CLOUDWATCH_METRICS_NAMESPACE', '');
    const appConfig = AppConfigService.getInstance();
    const expectedMessage = 'Invalid configuration - Environment variable CLOUDWATCH_METRICS_NAMESPACE is not defined.';
    expect(() => appConfig.cloudWatchMetricsWorkSpace).toThrow(new InvalidEnvironmentVariableError(expectedMessage));
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledWith(expectedMessage);
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
    expect(appConfig.maxRetentionSeconds).toEqual(12_345);
    expect(appConfig.txmaEgressQueueUrl).toEqual('https://sqs.eu-west-2.amazonaws.com/111122223333/TxMAQueue');
    expect(appConfig.historyRetentionSeconds).toEqual(63_072_000);
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
});
