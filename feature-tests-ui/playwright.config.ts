// playwright.config.ts
import 'dotenv/config';
import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'tests/features/**/*.feature',
  steps: 'tests/step-definitions/**/*.ts',
});

export default defineConfig({
  testDir,
  use: {
    baseURL: process.env['FRONTEND_URL'] ?? "http://localhost:4601",
    headless: true,
    channel: 'chrome',
  },
  reporter: [['html'], ['junit', { outputFile: 'results/report.xml' }]],
});
