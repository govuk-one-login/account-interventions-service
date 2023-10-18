import logger from '../commons/logger';
import { LOGS_PREFIX_INVALID_CONFIG } from '../data-types/constants';
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
}
