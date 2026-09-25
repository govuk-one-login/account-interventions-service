import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    coverage: {
      enabled: false,
    },
    // this set up will work as we have only one tag if we add others we will
    // need to modify it to look for the specific tag
    tags: [
      {
        name: 'dynamodb-local',
        description: 'Tests that require a local DynamoDB Docker instance.',
        skip: false,
      },
    ],
  },
});
