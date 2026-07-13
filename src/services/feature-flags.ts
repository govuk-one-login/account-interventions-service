/**
 * A service for feature flags.
 *
 * To add a new flag, add a single entry to FLAGS below with its env var name and default value.
 * It will automatically be readable via `featureFlags.isEnabled('yourFlagName')`.
 *
 * For local development, use FeatureFlagsStub to hardcode flag values without relying on env vars.
 */

interface FlagDefinition {
  envVar: string;
  defaultValue: boolean;
}

const FLAGS = {
  aisFrontend: { envVar: 'ENABLE_AIS_FRONTEND', defaultValue: false },
} as const satisfies Record<string, FlagDefinition>;

type FlagName = keyof typeof FLAGS;

export interface FeatureFlags {
  isEnabled(flag: FlagName): boolean;
}

export class FeatureFlagsFromEnvironmentVariables implements FeatureFlags {
  private static readonly instance = new FeatureFlagsFromEnvironmentVariables();

  static getInstance(): FeatureFlagsFromEnvironmentVariables {
    return this.instance;
  }

  /**
   * Returns the value of the given feature flag based on environment variables and defaults.
   */
  public isEnabled(flag: FlagName): boolean {
    const { envVar, defaultValue } = FLAGS[flag];
    return getEnvironmentVariableAsBoolean(envVar) ?? defaultValue;
  }
}

/**
 * A stub implementation of IFeatureFlags for local development.
 * Provide explicit values for each flag rather than relying on environment variables.
 */
export class FeatureFlagsStub implements FeatureFlags {
  private readonly flags: Record<FlagName, boolean>;

  constructor(flags: Record<FlagName, boolean>) {
    this.flags = flags;
  }

  public isEnabled(flag: FlagName): boolean {
    return this.flags[flag];
  }
}

function getEnvironmentVariableAsBoolean(name: string): boolean | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  return Boolean(value);
}
