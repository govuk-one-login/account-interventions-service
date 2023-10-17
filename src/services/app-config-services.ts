import logger from '../commons/logger';
import { LOGS_PREFIX_INVALID_CONFIG, RegexpStepFunctionArn } from '../data-types/constants';
import { InvalidEnvironmentVariableError } from '../data-types/errors';

/**
 * A service for setting the app configuration.
 */
export class AppConfigService {
  private static instance: AppConfigService;

  /**
   * A static method which creates a single instance of the AppConfigService class and returns it.
   */
  public static getInstance(): AppConfigService {
    if (!AppConfigService.instance) {
      AppConfigService.instance = new AppConfigService();
    }
    return AppConfigService.instance;
  }

  public get tableName(): string {
    return this.validateConfiguration('ACCOUNT_STATUS_TABLE_NAME');
  }

  public get maxRetentionSeconds(): number {
    const retentionSecond = Number.parseInt(this.validateConfiguration('DELETED_ACCOUNT_STATUS_RETENTION_SECONDS'));
    return retentionSecond;
  }

  /**
   * A method for validating environment variables.
   *
   * @param environmentVariable - the environment variable to validate
   * @returns the environment variable value
   * @throws {@link InvalidEnvironmentVariableError}
   * Thrown when the environment variable value is falsy
   */
  private validateConfiguration(environmentVariable: string): string {
    if (!process.env[environmentVariable] || process.env[environmentVariable] === 'undefined') {
      const message = `${LOGS_PREFIX_INVALID_CONFIG} Environment variable ${environmentVariable} is not defined.`;
      logger.error(message);
      throw new InvalidEnvironmentVariableError(message);
    }
    return process.env[environmentVariable] as string;
  }

  private validateNumberEnvVars(environmentVariable: string): number {
    const environmentVariableValue = Number.parseInt(this.validateConfiguration(environmentVariable));
    if (Number.isNaN(environmentVariableValue) || environmentVariableValue <= 0) {
      const message = `${LOGS_PREFIX_INVALID_CONFIG} Environment variable ${environmentVariable} is not a number.`;
      logger.error(message);
      throw new InvalidEnvironmentVariableError(message);
    }
    return environmentVariableValue;
  }

  private validateStepFunctionArn(environmentVariable: string) {
    const stepFunctionArn = this.validateConfiguration(environmentVariable);
    if (!RegexpStepFunctionArn.test(stepFunctionArn)) {
      const message = `${LOGS_PREFIX_INVALID_CONFIG} Environment variable ${environmentVariable} is not a valid Step Function ARN (${stepFunctionArn}).`;
      logger.error(message);
      throw new InvalidEnvironmentVariableError(message);
    }
    return stepFunctionArn;
  }

  private validateIsHTTPSUrl(environmentVariable: string) {
    const url = this.validateConfiguration(environmentVariable);
    if (!url.startsWith('https://')) {
      const message = `${LOGS_PREFIX_INVALID_CONFIG} Environment variable ${environmentVariable} is not a valid HTTPS URL (${url}).`;
      logger.error(message);
      throw new InvalidEnvironmentVariableError(message);
    }
    return url;
  }
}
