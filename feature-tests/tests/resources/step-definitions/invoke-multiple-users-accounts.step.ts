import { defineFeature, loadFeature } from 'jest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { sendSQSEvent } from '../../../utils/send-sqs-message';
import { invokeGetAccountState } from '../../../utils/invoke-apigateway-lambda';
import { getRecordFromTable, updateItemInTable } from '../../../utils/dynamo-database-methods';
import { InformationFromTable, timeDelayForTestEnvironment } from '../../../utils/utility';
import * as fs from 'node:fs';

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
        for (let index = 0; index < numberOfUsers; index++) {
          const testUserId = generateRandomTestUserId();
          await sendSQSEvent(testUserId, aisEventType);
          await timeDelayForTestEnvironment(500);
          response = await invokeGetAccountState(testUserId, historyValue);
          expect(response.intervention.description).toBe('AIS_ACCOUNT_SUSPENDED');
          listOfUsers.push(testUserId);
        }
        await Promise.allSettled(listOfUsers);
      },
    );

    and(/^I update the Id reset flag to TRUE$/, async () => {
      const updateResetPasswordItemInTable: InformationFromTable = {
        updatedAt: response.intervention.updatedAt,
        sentAt: response.intervention.sentAt,
        appliedAt: response.intervention.appliedAt,
        intervention: response.intervention.description,
        suspended: response.state.suspended,
        reproveIdentity: response.state.reproveIdentity,
        resetPassword: true,
        blocked: response.state.blocked,
      };
      for (const user of listOfUsers) {
        await timeDelayForTestEnvironment(500);
        await updateItemInTable(user, updateResetPasswordItemInTable);
        let getItem = await getRecordFromTable(user);
        if (getItem) {
          console.log(getItem);
          expect(getItem.resetPassword).toBe(true);
        }
      }
    });

    when(/^I Invoke an API to view the records$/, async () => {
      for (const user of listOfUsers) {
        await timeDelayForTestEnvironment(200);
        response = await invokeGetAccountState(user, true);
      }
    });

    then(/^the expected response (.*) is returned for the requested number of users$/, async (interventionType) => {
      for (let index = 0; index < listOfUsers.length; index++) {
        expect(response.intervention.description).toBe(interventionType);
        expect(response.state.blocked).toBe(false);
        expect(response.state.suspended).toBe(true);
        expect(response.state.resetPassword).toBe(true);
        expect(response.state.reproveIdentity).toBe(false);
      }
      //Writing the list of users to the usersList file
      try {
        fs.writeFileSync('usersList.txt', JSON.stringify(listOfUsers), { flag: 'w' });
        console.log('File written successfully');
      } catch (error) {
        console.error('Error while writing the list of users to a file', { error });
      }
    });
  });
});
