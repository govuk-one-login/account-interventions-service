import { createBdd, test as base } from "playwright-bdd";
import { expect } from "@playwright/test";
import { sendSQSEvent } from '../../utils/send-sqs-message';
import { generateRandomTestUserId } from '../../utils/generate-random-test-user-id';
import { timeDelayForTestEnvironment } from '../../utils/utility';

type TestFixtures = {
  testUserId: { value: string };
};

export const test = base.extend<TestFixtures>({
  testUserId: async ({}, use) => {
    const holder = { value: '' };
    await use(holder);
  },
});

const { Given, When, Then } = createBdd(test);
  
Given('a user has a {string} intervention on their account', async ({ testUserId }, aisEventType: string) => {
  testUserId.value = generateRandomTestUserId();
  await sendSQSEvent(testUserId.value, aisEventType);
  await timeDelayForTestEnvironment(5000);
});

Given('an invalid urn of {string} is used to search via the UI', async ({ page }, invalidUrn: string) => {
  await page.goto(process.env.FRONTEND_URL!);
  await page.getByRole('textbox', { name: /subject identifier/i }).fill(invalidUrn);
  await page.getByRole('button', { name: 'Submit' }).click();
});

Given('I search for a user with a valid URN via the UI', async ({ page, testUserId }) => {
  testUserId.value = generateRandomTestUserId();
  await page.goto(process.env.FRONTEND_URL!);
  await page.getByRole('textbox', { name: /subject identifier/i }).fill(testUserId.value);
  await page.getByRole('button', { name: 'Submit' }).click();
});

When('I search for the user via the UI', async ({ page, testUserId }) => {
  await page.goto(process.env.FRONTEND_URL!);
  await page.getByRole('textbox', { name: /subject identifier/i }).fill(testUserId.value);
  await page.getByRole('button', { name: 'Submit' }).click();
});

Then('I should see the intervention history for the correct user', async ({ page, testUserId }) => {
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect (page.locator('.govuk-body', { hasText: testUserId.value}).first()).toBeVisible();
  await expect(page.locator('.govuk-inset-text')).toHaveCount(1);
});

Then('the history should show that the intervention was {string}', async ({ page }, triggeredBy: string) => {
  await expect (page.locator('.govuk-tag', { hasText: triggeredBy}).first()).toBeVisible();
});

Then('I should see {string} displayed for this account', async ({ page }, noInterventionText: string) => {
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect (page.locator('.govuk-body-s', { hasText: noInterventionText}).first()).toBeVisible();
});
