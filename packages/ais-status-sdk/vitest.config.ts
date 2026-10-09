import { defineConfig } from 'vitest/config';

// todo delete
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
