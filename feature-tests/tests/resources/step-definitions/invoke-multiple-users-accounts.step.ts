import { defineFeature, loadFeature } from 'jest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { sendSQSEvent } from '../../../utils/send-sqs-message';
import { invokeGetAccountState } from '../../../utils/invoke-apigateway-lambda';

const feature = loadFeature('./tests/resources/features/aisGET/InvokeMultipleUsers-HappyPath.feature');

defineFeature(feature, (test) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let response: any;
  const listOfUsers: string[] = [];

  test('Happy Path - create multiple users - Returns Expected Data for <aisEventType>', ({
    given,
    and,
    when,
    then,
  }) => {
    given(
      /^I invoke an API to retrieve the (.*) status to the (.*) accounts. With history (.*)$/,
      async (aisEventType, numberOfUsers, historyValue) => {
        for (let index = 0; index <= numberOfUsers; index++) {
          const testUserId = generateRandomTestUserId();
          await sendSQSEvent(testUserId, aisEventType);
          response = await invokeGetAccountState(testUserId, historyValue);
          expect(response.intervention.description).toBe('AIS_ACCOUNT_SUSPENDED');
          expect(response.state.blocked).toBe(Boolean(false));
          expect(response.state.suspended).toBe(Boolean(true));
          expect(response.state.resetPassword).toBe(Boolean(false));
          expect(response.state.reproveIdentity).toBe(Boolean(false));
          listOfUsers.push(testUserId);
        }
        await Promise.allSettled(listOfUsers);
      },
    );

    and(/^I set the Id reset flag to TRUE$/, async () => {});

    when(/^I Invoke an API to view the records$/, async () => {});

    then(/^the expected (.*) is returned for the requested number of users$/, async () => {});
  });
});
