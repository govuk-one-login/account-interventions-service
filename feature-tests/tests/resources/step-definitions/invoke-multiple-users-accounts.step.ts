import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { sendSQSEvent } from '../../../utils/send-sqs-message';
import { invokeGetAccountState } from '../../../utils/invoke-apigateway-lambda';
import { updateItemInTable, getRecordFromTable } from '../../../utils/dynamo-database-methods';
import { InformationFromTable, timeDelayForTestEnvironment } from '../../../utils/utility';
import * as fs from 'node:fs';
import { AisResponseType } from '../../../utils/ais-events-responses';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';

const feature = await loadFeature('./tests/resources/features/aisGET/InvokeMultipleUsers-HappyPath.feature');

describeFeature(feature, ({ ScenarioOutline }) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let response: AisResponseType;
  const listOfUsers: string[] = [];

  ScenarioOutline(
    'Happy Path - create multiple users - Returns Expected Data for <aisEventType>',
    ({ Given, And, When, Then }, { aisEventType, numberOfUsers, historyValue, interventionType }) => {
      Given(
        'I invoke an API to retrieve the <aisEventType> status to the <numberOfUsers> accounts. With history <historyValue>',
        async () => {
          for (let index = 0; index < numberOfUsers; index++) {
            const testUserId = generateRandomTestUserId();
            await sendSQSEvent(testUserId, aisEventType);
            await timeDelayForTestEnvironment();
            response = await invokeGetAccountState(testUserId, historyValue);
            expect(response.intervention.description).toBe('AIS_ACCOUNT_SUSPENDED');
            listOfUsers.push(testUserId);
          }
          await Promise.allSettled(listOfUsers);
        },
      );

      And('I update the Id reset flag to TRUE', async () => {
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
          await timeDelayForTestEnvironment();
          await updateItemInTable(user, updateResetPasswordItemInTable);
          await timeDelayForTestEnvironment();
          const getItem = await getRecordFromTable(user);
          if (getItem) {
            console.log(getItem);
            expect(getItem.resetPassword).toBe(true);
          }
        }
      });

      When('I Invoke an API to view the records', async () => {
        for (const user of listOfUsers) {
          await timeDelayForTestEnvironment();
          response = await invokeGetAccountState(user, true);
        }
      });

      Then('the expected response <interventionType> is returned for the requested number of users', async () => {
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
    },
  );
});
