import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import { sendSQSEvent } from '../../utils/send-sqs-message';
import { generateRandomTestUserId } from '../../utils/generate-random-test-user-id';
import { timeDelayForTestEnvironment } from '../../utils/utility';

const { Given, When, Then } = createBdd();

let testUserId: string;
  
Given('a user has a {string} intervention on their account', async ({}, aisEventType: string) => {
  testUserId = generateRandomTestUserId();
  await sendSQSEvent(testUserId, aisEventType);
  await timeDelayForTestEnvironment(5000);
});

When('I search for the user on the frontend', async ({ page }) => {
  console.log('Navigating to:', process.env.FRONTEND_URL);
  const response = await page.goto(process.env.FRONTEND_URL!);
  await page.getByRole('textbox', { name: /subject identifier/i }).fill(testUserId);
  await page.getByRole('button', { name: 'Submit' }).click();
});

Then('I should see the intervention history', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect(page.locator('.govuk-inset-text')).toHaveCount(1);
});

Then('the history should show intervention state {string}', async ({ page }, state: string) => {
  console.log('state:', state)
  await expect (page.getByText(state, { exact: true })).toBeVisible();
});
