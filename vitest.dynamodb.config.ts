import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

// Runs the dynamodb-local tests only (`npm run test:unit:dynamodb-local`).
// Overrides the tag's skip from the base config so these tests actually run.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    coverage: {
      enabled: false,
    },
    // NOTE: this works because there is a single tag. If more tags are added,
    // this override must be adjusted to target the specific tag.
    tags: [
      {
        name: 'dynamodb-local',
        description: 'Tests that require a local DynamoDB instance.',
        skip: false,
      },
    ],
  },
});
