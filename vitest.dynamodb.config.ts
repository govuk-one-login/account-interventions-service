import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        enabled: false,
      },
      env: {
        TEST_DYNAMODB_LOCAL: 'true',
      },
    },
  }),
);
