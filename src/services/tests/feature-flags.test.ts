import { FeatureFlagsFromEnvironmentVariables, FeatureFlagsStub } from '../feature-flags';

describe('FeatureFlags', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('isEnabled', () => {
    it('returns the default value when no env var is set', () => {
      vi.stubEnv('ENABLE_AIS_FRONTEND', '');
      expect(FeatureFlagsFromEnvironmentVariables.getInstance().isEnabled('aisFrontend')).toBe(false);
    });

    it('returns true when the env var is set', () => {
      vi.stubEnv('ENABLE_AIS_FRONTEND', 'true');
      expect(FeatureFlagsFromEnvironmentVariables.getInstance().isEnabled('aisFrontend')).toBe(true);
    });

    it('returns false when the env var is cleared', () => {
      vi.stubEnv('ENABLE_AIS_FRONTEND', 'true');
      vi.stubEnv('ENABLE_AIS_FRONTEND', '');
      expect(FeatureFlagsFromEnvironmentVariables.getInstance().isEnabled('aisFrontend')).toBe(false);
    });
  });
});

describe('FeatureFlagsStub', () => {
  it('returns the value provided at construction', () => {
    expect(new FeatureFlagsStub({ aisFrontend: true }).isEnabled('aisFrontend')).toBe(true);
    expect(new FeatureFlagsStub({ aisFrontend: false }).isEnabled('aisFrontend')).toBe(false);
  });
});
