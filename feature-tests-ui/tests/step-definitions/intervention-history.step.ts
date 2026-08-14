/* eslint-disable unicorn/no-top-level-side-effects */
/* eslint-disable no-empty-pattern */
import { createBdd, test as base } from "playwright-bdd";
import { expect } from "@playwright/test";
import { sendSQSEvent } from '../../utils/send-sqs-message';
import { generateRandomTestUserId } from '../../utils/generate-random-test-user-id';
import { timeDelayForTestEnvironment } from '../../utils/time-utils';
import { SQS } from '@aws-sdk/client-sqs';
import EndPoints from '../../utils/endpoints';

interface TestFixtures {
  testUserId: { value: string};
  sqs: SQS;
  sqsQueueUrl: string | undefined;
  frontendUrl: string;
}

export const test = base.extend<TestFixtures>({
  testUserId: async ({}, use) => {
    const holder = { value: '' };
    await use(holder);
  },
  sqs: async ({}, use) => {
    const sqsClient = new SQS({ apiVersion: '2012-11-05', region: process.env.AWS_REGION });
    await use(sqsClient);
  },
  sqsQueueUrl: async ({}, use) => {
    const url = EndPoints.SQS_QUEUE_URL;
    await use(url);
  },
  frontendUrl: async ({}, use) => {
    if (!process.env.FRONTEND_URL) throw new Error('FRONTEND_URL environment variable is not set');
    const url = process.env.FRONTEND_URL;
    await use(url);
  },
});

const { Given, When, Then } = createBdd(test);

Given('a user has a {string} intervention on their account', async ({ testUserId, sqs, sqsQueueUrl }, aisEventType: string) => {
  testUserId.value = generateRandomTestUserId();
  await sendSQSEvent(sqs, sqsQueueUrl, testUserId.value, aisEventType);
  await timeDelayForTestEnvironment(5000);
});

Given('an invalid urn of {string} is used to search via the UI', async ({ page, frontendUrl }, invalidUrn: string) => {
  await page.goto(frontendUrl);
  await page.getByRole('textbox', { name: /subject identifier/i }).fill(invalidUrn);
  await page.getByRole('button', { name: 'Submit' }).click();
});

Given('I search for a user with a valid URN via the UI', async ({ page, testUserId, frontendUrl }) => {
  testUserId.value = generateRandomTestUserId();
  await page.goto(frontendUrl);
  await page.getByRole('textbox', { name: /subject identifier/i }).fill(testUserId.value);
  await page.getByRole('button', { name: 'Submit' }).click();
});

When('I search for the user via the UI', async ({ page, testUserId, frontendUrl }) => {
  await page.goto(frontendUrl);
  await page.getByRole('textbox', { name: /subject identifier/i }).fill(testUserId.value);
  await page.getByRole('button', { name: 'Submit' }).click();
});

Then('I should see the intervention history for the correct user', async ({ page, testUserId }) => {
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect (page.locator('.govuk-body', { hasText: testUserId.value }).first()).toBeVisible();
  await expect(page.locator('.govuk-inset-text')).toHaveCount(1);
});

Then('the history should show that the intervention was {string}', async ({ page }, triggeredBy: string) => {
  await expect (page.locator('.govuk-tag', { hasText: triggeredBy }).first()).toBeVisible();
});

Then('I should see {string} displayed for this account', async ({ page }, noInterventionText: string) => {
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect (page.locator('.govuk-body-s', { hasText: noInterventionText }).first()).toBeVisible();
});
