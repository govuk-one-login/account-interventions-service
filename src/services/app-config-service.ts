import { InvalidEnvironmentVariableError } from '../data-types/errors';
import logger from '../commons/logger';
import { LOGS_PREFIX_INVALID_CONFIG } from '../data-types/constants';

/**
 * A service for setting the app configuration.
 */
export interface ConfigService {
  readonly metricServiceName: string;
  readonly tableName: string;
  readonly cloudWatchMetricsWorkSpace: string;
  readonly awsRegion: string;
  readonly maxRetentionSeconds: number;
  readonly txmaEgressQueueUrl: string;
  readonly historyRetentionSeconds: number;
}

export class InMemoryConfigService implements ConfigService {
  constructor(private readonly config: Partial<ConfigService> = {}) {}

  private get<K extends keyof ConfigService>(key: K): ConfigService[K] {
    if (this.config[key] === undefined) {
      throw new InvalidEnvironmentVariableError(`${key} has not been configured`);
    }
    return this.config[key];
  }

  public get metricServiceName() {
    return this.get('metricServiceName');
  }
  public get tableName() {
    return this.get('tableName');
  }
  public get cloudWatchMetricsWorkSpace() {
    return this.get('cloudWatchMetricsWorkSpace');
  }
  public get awsRegion() {
    return this.get('awsRegion');
  }
  public get maxRetentionSeconds() {
    return this.get('maxRetentionSeconds');
  }
  public get txmaEgressQueueUrl() {
    return this.get('txmaEgressQueueUrl');
  }
  public get historyRetentionSeconds() {
    return this.get('historyRetentionSeconds');
  }
}

export class AppConfigService implements ConfigService {
  private static instance: AppConfigService;

  /**
   * A static method which creates a single instance of the AppConfigService class and returns it.
   */
  public static getInstance(): AppConfigService {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

  public get historyRetentionSeconds(): number {
    return this.validateNumberEnvVars('HISTORY_RETENTION_SECONDS');
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
    return process.env[environmentVariable];
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

export function createAppConfigService() {
  return new AppConfigService();
}

let appConfigSingleton: undefined | AppConfigService;

export function getSingletonAppConfigService() {
  appConfigSingleton ??= createAppConfigService();
  return appConfigSingleton;
}
