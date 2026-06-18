import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { sendSQSEvent } from '../../../utils/send-sqs-message';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import { getInterventionEventRecordFromTable, InterventionEvent } from '../../../utils/dynamo-database-methods';

const feature = await loadFeature('./tests/resources/features/InterventionEvents.feature');

describeFeature(feature, ({ Scenario, BeforeEachScenario }) => {
  let testUserId: string;
  let itemFromDatabase: InterventionEvent | undefined;

  BeforeEachScenario(() => {
    testUserId = generateRandomTestUserId();
  });

  Scenario('Database record inserted when intervention sent', ({ Given, When, Then }) => {
    Given('I send an intervention to the TxMA ingress SQS queue', async () => {
      await sendSQSEvent(testUserId, 'suspendNoAction');
    });

    When('I fetch the intervention events from the database table', async () => {
      await timeDelayForTestEnvironment(4000);
      itemFromDatabase = await getInterventionEventRecordFromTable(testUserId);
    });

    Then('I expect to find an ACTIVE record for the intervention', async () => {
      expect(itemFromDatabase).toEqual({
        accountId: testUserId,
        componentId: 'TICF_CRI',
        createdAt: expect.any(Number),
        eventId: expect.any(String),
        interventionName: 'TEMPORARY_SUSPENSION',
        interventionReason: 'suspend - 01',
        interventionState: 'ACTIVE',
        originatingComponentId: 'CMS',
        originatorReferenceId: '1234567',
        requesterId: '1234567',
        sentAt: expect.any(Number),
      });
    });
  });
});
