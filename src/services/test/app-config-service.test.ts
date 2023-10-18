import { AppConfigService } from '../app-config-service';
import { InvalidEnvironmentVariableError } from '../../data-types/errors';
import 'jest-extended';
import logger from '../../commons/logger';

jest.mock('@aws-lambda-powertools/logger');

describe('AppConfigService', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env['NODE_ENV'];
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('should throw an error if the environment variable AWS_REGION is undefined', () => {
    process.env['AWS_REGION'] = undefined;
    const appConfig = AppConfigService.getInstance();
    const expectedMessage = 'Invalid configuration - Environment variable AWS_REGION is not defined.';
    expect(() => appConfig.awsRegion).toThrowWithMessage(InvalidEnvironmentVariableError, expectedMessage);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(expectedMessage);
  });

  it('should throw an error if the environment variable TABLE_NAME is equal to an empty string', () => {
    process.env['TABLE_NAME'] = '';
    const appConfig = AppConfigService.getInstance();
    const expectedMessage = 'Invalid configuration - Environment variable TABLE_NAME is not defined.';
    expect(() => appConfig.tableName).toThrowWithMessage(InvalidEnvironmentVariableError, expectedMessage);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(expectedMessage);
  });

  it('should return the value of all environment variables', () => {
    const appConfig = AppConfigService.getInstance();
    expect(appConfig.awsRegion).toEqual('aws_region');
    expect(appConfig.tableName).toEqual('table_name');
    expect(appConfig.cloudWatchMetricsWorkSpace).toEqual('test_namespace');
  });
});
