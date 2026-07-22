import { InvalidEnvironmentVariableError } from '../data-types/errors';
import logger from '../commons/logger';
import { LOGS_PREFIX_INVALID_CONFIG } from '../data-types/constants';

interface ConfigDefinition {
  envVar: string;
  type: string;
  optional?: boolean;
}

/**
 * Maps config names to their corresponding environment variable and validation type.
 *
 * - `envVar`: the environment variable name to read from process.env.
 * - `type`: determines how the value is validated ('string', 'number', or 'url').
 * - `optional`: if true, returns undefined with a warning instead of throwing when the env var is missing.
 *
 * To add a new config value, add an entry here and it will be available via getConfigObject.
 * Uses `satisfies` (not a type annotation) to preserve literal types for the conditional type inference.
 */
const CONFIG_ENVIRONMENT_MAPPING = {
  metricServiceName: {
    envVar: 'METRIC_SERVICE_NAME',
    type: 'string' as const,
    optional: true,
  },
  tableName: {
    envVar: 'TABLE_NAME',
    type: 'string' as const,
  },
  interventionEventsTableName: {
    envVar: 'INTERVENTION_EVENTS_TABLE_NAME',
    type: 'string' as const,
  },
  cloudWatchMetricsWorkSpace: {
    envVar: 'CLOUDWATCH_METRICS_NAMESPACE',
    type: 'string' as const,
    optional: true,
  },
  awsRegion: {
    envVar: 'AWS_REGION',
    type: 'string' as const,
  },
  maxRetentionSeconds: {
    envVar: 'DELETED_ACCOUNT_RETENTION_SECONDS',
    type: 'number' as const,
  },
  txmaEgressQueueUrl: {
    envVar: 'TXMA_QUEUE_URL',
    type: 'url' as const,
  },
  historyRetentionSeconds: {
    envVar: 'HISTORY_RETENTION_SECONDS',
    type: 'number' as const,
  },
} satisfies Record<string, ConfigDefinition>;

/** The valid keys of CONFIG_ENVIRONMENT_MAPPING, used to constrain getConfigObject input. */
type ConfigName = keyof typeof CONFIG_ENVIRONMENT_MAPPING;

/** Resolves whether a config entry is optional (returns undefined on failure instead of throwing). */
type IsOptional<T extends ConfigName> = (typeof CONFIG_ENVIRONMENT_MAPPING)[T] extends { optional: true }
  ? true
  : false;

/**
 * Maps a config entry to its runtime value type.
 * - 'number' entries resolve to `number` (or `number | undefined` if optional).
 * - 'string' and 'url' entries resolve to `string` (or `string | undefined` if optional).
 */
type ConfigValueType<T extends ConfigName> = (typeof CONFIG_ENVIRONMENT_MAPPING)[T]['type'] extends 'number'
  ? IsOptional<T> extends true
    ? number | undefined
    : number
  : IsOptional<T> extends true
    ? string | undefined
    : string;

/**
 * The return type of getConfigObject — an object keyed by the requested config names,
 * with each value typed according to its entry in CONFIG_ENVIRONMENT_MAPPING.
 */
type ConfigObject<T extends ConfigName[]> = {
  [K in T[number]]: ConfigValueType<K>;
};

/**
 * Service for accessing validated application configuration from environment variables.
 * Use getConfigObject to retrieve multiple config values as a typed object,
 * or the individual getters for backwards compatibility.
 */
export class AppConfigService {
  private static instance: AppConfigService;

  /**
   * Returns a typed object containing the requested config values, validated and parsed
   * according to their type definitions in CONFIG_ENVIRONMENT_MAPPING.
   *
   * @param keys - an array of config names to retrieve
   * @returns an object keyed by the requested names, with values typed as string, number, or undefined (for optional configs)
   * @throws {@link InvalidEnvironmentVariableError} if a required config value is missing or invalid
   *
   * @example
   * const config = AppConfigService.getInstance().getConfigObject(['tableName', 'maxRetentionSeconds']);
   * // config.tableName → string
   * // config.maxRetentionSeconds → number
   */
  public getConfigObject<T extends ConfigName[]>(keys: [...T]): ConfigObject<T> {
    const result = {} as ConfigObject<T>;
    for (const key of keys) {
      const config = CONFIG_ENVIRONMENT_MAPPING[key];
      const optional = 'optional' in config ? config.optional : false;
      (result as Record<string, unknown>)[key] = this.resolveConfigValue(config.envVar, config.type, optional);
    }
    return result;
  }

  private resolveConfigValue(
    envVar: string,
    type: 'string' | 'number' | 'url',
    optional: boolean,
  ): string | number | undefined {
    try {
      switch (type) {
        case 'number': {
          return this.validateNumberEnvVars(envVar);
        }
        case 'url': {
          return this.validateIsHTTPSUrl(envVar);
        }
        case 'string': {
          return this.validateConfiguration(envVar);
        }
      }
    } catch (error) {
      if (optional) {
        logger.warn(`Unable to retrieve config, ${envVar} not set`);
        return undefined;
      }
      throw error;
    }
  }

  /**
   * A static method which creates a single instance of the AppConfigService class and returns it.
   */
  public static getInstance(): AppConfigService {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!this.instance) {
      AppConfigService.instance = new AppConfigService();
    }
    return this.instance;
  }

  public get metricServiceName(): string | undefined {
    try {
      return this.validateConfiguration('METRIC_SERVICE_NAME');
    } catch {
      logger.warn('Unable to retrieve metrics config, METRIC_SERVICE_NAME not set');
    }
  }

  public get tableName(): string {
    return this.validateConfiguration('TABLE_NAME');
  }

  public get interventionEventsTableName(): string {
    return this.validateConfiguration('INTERVENTION_EVENTS_TABLE_NAME');
  }

  public get cloudWatchMetricsWorkSpace(): string | undefined {
    try {
      return this.validateConfiguration('CLOUDWATCH_METRICS_NAMESPACE');
    } catch {
      logger.warn('Unable to retrieve metrics config, CLOUDWATCH_METRICS_NAMESPACE not set');
    }
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
    const environmentValue = process.env[environmentVariable];

    if (!environmentValue || environmentValue === 'undefined') {
      const message = `${LOGS_PREFIX_INVALID_CONFIG} Environment variable ${environmentVariable} is not defined.`;
      logger.error(message);
      throw new InvalidEnvironmentVariableError(message);
    }
    return environmentValue;
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
