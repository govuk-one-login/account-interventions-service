import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
    },
    include: ['**/*.step.ts'],
    retry: 3,
    hideSkippedTests: true,
    testTimeout: 60_000,
    env: {
      TEST_ENVIRONMENT: 'dev',
      SAM_STACK_NAME: 'ais-main',
      AWS_REGION: 'eu-west-2',
      AWS_PROFILE: 'dev',
      tagFilter: '@regression',
    },
  },
});
