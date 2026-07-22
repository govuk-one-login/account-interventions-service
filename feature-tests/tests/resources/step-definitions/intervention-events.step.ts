import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { sendSQSEvent } from '../../../utils/send-sqs-message';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import { getInterventionEventsRecordsFromTable } from '../../../utils/dynamo-database-methods';

const feature = await loadFeature('./tests/resources/features/InterventionEvents.feature');

describeFeature(feature, ({ Scenario, BeforeEachScenario }) => {
  let testUserId: string;
  let itemFromDatabase: Record<string, any>[] | undefined;

  BeforeEachScenario(() => {
    testUserId = generateRandomTestUserId();
  });

  Scenario('Database record inserted when intervention sent', ({ Given, When, Then }) => {
    Given('I send an intervention to the TxMA ingress SQS queue', async () => {
      await sendSQSEvent(testUserId, 'suspendNoAction');
    });

    When('I fetch the intervention events from the database table', async () => {
      await timeDelayForTestEnvironment(4000);
      itemFromDatabase = await getInterventionEventsRecordsFromTable(testUserId);
    });

    Then('I expect to find an ACTIVE record for the intervention', async () => {
      expect(itemFromDatabase).toEqual([
        {
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
          messageEventId: '123',
          transactionId: expect.any(String),
        },
      ]);
    });
  });

  Scenario('Two database records inserted when intervention and mitigation sent', ({ Given, And, When, Then }) => {
    Given('I send an intervention to the TxMA ingress SQS queue', async () => {
      await sendSQSEvent(testUserId, 'pswResetRequired');
    });

    And('I send a mitigation to the TxMA ingress SQS queue', async () => {
      await timeDelayForTestEnvironment(4000);
      await sendSQSEvent(testUserId, 'userActionPswResetSuccess');
    });

    When('I fetch the intervention events from the database table', async () => {
      await timeDelayForTestEnvironment(4000);
      itemFromDatabase = await getInterventionEventsRecordsFromTable(testUserId);
    });

    Then('I expect to find an ACTIVE record for the intervention', async () => {
      expect(itemFromDatabase).toEqual([
        {
          accountId: testUserId,
          componentId: 'TICF_CRI',
          createdAt: expect.any(Number),
          eventId: expect.any(String),
          interventionName: 'RESET_PASSWORD',
          interventionReason: 'password reset - 04',
          interventionState: 'ACTIVE',
          originatingComponentId: 'CMS',
          originatorReferenceId: '1234567',
          requesterId: '1234567',
          sentAt: expect.any(Number),
          messageEventId: '123',
          transactionId: expect.any(String),
          ttl: expect.any(Number),
        },
        {
          accountId: testUserId,
          componentId: 'UNKNOWN',
          createdAt: expect.any(Number),
          eventId: expect.any(String),
          interventionName: 'RESET_PASSWORD',
          interventionReason: '',
          interventionState: 'MITIGATED',
          sentAt: expect.any(Number),
          messageEventId: '123',
          transactionId: expect.any(String),
          ttl: expect.any(Number),
        },
      ]);
    });
  });
});
