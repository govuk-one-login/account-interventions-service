import { InvalidEnvironmentVariableError } from '../data-types/errors';
import logger from '../commons/logger';
import { LOGS_PREFIX_INVALID_CONFIG } from '../data-types/constants';

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

  public get metricServiceName(): string {
    return this.validateConfiguration('METRIC_SERVICE_NAME');
  }

  public get tableName(): string {
    return this.validateConfiguration('TABLE_NAME');
  }

  public get cloudWatchMetricsWorkSpace(): string {
    return this.validateConfiguration('CLOUDWATCH_METRICS_NAMESPACE');
  }
  public get awsRegion(): string {
    return this.validateConfiguration('AWS_REGION');
  }

  public get maxRetentionSeconds(): number {
    return this.validateNumberEnvVars('DELETED_ACCOUNT_RETENTION_SECONDS');
  }

  public get txmaEgressQueueUrl(): string {
    return this.validateIsHTTPSUrl('TXMA_QUEUE_URL');
  }

  public get userId() {
    return process.env['USER_ID']
  }

  public get baseUrl() {
    return this.validateConfiguration('BASE_URL');
  }

  public get endpoint() {
    const endpoint = this.validateConfiguration('END_POINT');
    const prefix = endpoint.charAt(0) === '/' ? '' : '/';
    return prefix + endpoint;
  }

  public get queryParameters() {
    return process.env['QUERY_PARAMETERS']
  }

  public get httpRequestMethod() {
    return this.validateConfiguration('HTTP_REQUEST_METHOD');
  }

  /**
   * A method for validating environment variables.
   *
   * @param environmentVariable - the environment variable to validate
   * @returns the environment variable value
   * @throws {@link InvalidEnvironmentVariableError}
   * Thrown when the environment variable value is falsy
   */

  private validateNumberEnvVars(environmentVariable: string): number {
    const environmentVariableValue = Number.parseInt(this.validateConfiguration(environmentVariable));
    if (Number.isNaN(environmentVariableValue) || environmentVariableValue < 0) {
      const message = `${LOGS_PREFIX_INVALID_CONFIG} Environment variable ${environmentVariable} is not a number.`;
      logger.error(message);
      throw new InvalidEnvironmentVariableError(message);
    }
    return environmentVariableValue;
  }

  private validateConfiguration(environmentVariable: string): string {
    if (!process.env[environmentVariable] || process.env[environmentVariable] === 'undefined') {
      const message = `${LOGS_PREFIX_INVALID_CONFIG} Environment variable ${environmentVariable} is not defined.`;
      logger.error(message);
      throw new InvalidEnvironmentVariableError(message);
    }
    return process.env[environmentVariable] as string;
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
