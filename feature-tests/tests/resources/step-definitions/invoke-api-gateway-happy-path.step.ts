import { defineFeature, loadFeature } from 'jest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { sendSQSEvent } from '../../../utils/send-sqs-message';
import { filterCloudWatchLogs } from '../../../utils/cloudwatch-logs';
import { invokeGetAccountState } from '../../../utils/invoke-apigateway-lambda';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import { FilteredLogEvent } from '@aws-sdk/client-cloudwatch-logs';

const feature = loadFeature('./tests/resources/features/aisGET/InvokeApiGateWay-HappyPath.feature');

interface EventMessage {
  message?: string;
  userId?: string;
}

defineFeature(feature, (test) => {
  let testUserId: string;
  let startTime: number;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let response: any;
  let events: FilteredLogEvent[];
  let messages: (string | EventMessage | undefined)[];

  beforeAll(() => {
    startTime = Date.now();
  });

  beforeEach(() => {
    testUserId = generateRandomTestUserId();
  });

  test('Happy Path - Get Request to /ais/userId - Returns Expected Data for <aisEventType>', ({
    given,
    when,
    then,
  }) => {
    given(/^I send an (.*) intervention message to the TxMA ingress SQS queue$/, async (aisEventType) => {
      await sendSQSEvent(testUserId, aisEventType);
    });

    when(
      /^I invoke the API to retrieve the intervention status of the user's account. With history (.*)$/,
      async (historyValue) => {
        await timeDelayForTestEnvironment(1500);
        response = await invokeGetAccountState(testUserId, historyValue);
      },
    );

    then(
      /^I expect the intervention to be (.*), with the following state settings (.*), (.*), (.*) and (.*)$/,
      async (
        interventionType: string,
        blockedState: string,
        suspendedState: string,
        resetPassword: string,
        reproveIdentity: string,
      ) => {
        console.log(`Received`, { response });
        expect(response.intervention.description).toBe(interventionType);
        expect(response.intervention.state.blocked).toBe(JSON.parse(blockedState));
        expect(response.intervention.state.suspended).toBe(JSON.parse(suspendedState));
        expect(response.intervention.state.resetPassword).toBe(JSON.parse(resetPassword));
        expect(response.intervention.state.reproveIdentity).toBe(JSON.parse(reproveIdentity));
      },
    );
  });

  test('Happy Path - Suspended Account - Get Request to /ais/userId - Returns Expected Data for <aisEventType>', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send an (.*) intervention message to the TxMA ingress SQS queue for a Account in (.*) state$/,
      async (originalAaisEventType, aisEventType) => {
        await sendSQSEvent(testUserId, originalAaisEventType);
        await timeDelayForTestEnvironment(500);
        await sendSQSEvent(testUserId, aisEventType);
      },
    );

    when(
      /^I invoke the API to retrieve the intervention status of the user's account. With history (.*)$/,
      async (historyValue) => {
        await timeDelayForTestEnvironment(1500);
        response = await invokeGetAccountState(testUserId, historyValue);
      },
    );

    then(
      /^I expect the intervention to be (.*), with the following state settings (.*), (.*), (.*) and (.*)$/,
      async (
        interventionType: string,
        blockedState: string,
        suspendedState: string,
        resetPassword: string,
        reproveIdentity: string,
      ) => {
        console.log(`Received`, { response });
        expect(response.intervention.description).toBe(interventionType);
        expect(response.intervention.state.blocked).toBe(JSON.parse(blockedState));
        expect(response.intervention.state.suspended).toBe(JSON.parse(suspendedState));
        expect(response.intervention.state.resetPassword).toBe(JSON.parse(resetPassword));
        expect(response.intervention.state.reproveIdentity).toBe(JSON.parse(reproveIdentity));
      },
    );
  });

  test('Happy Path - Blocked Account - Get Request to /ais/userId - Returns Expected Data for <aisEventType>', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send an (.*) intervention message to the TxMA ingress SQS queue for a Account in (.*) state$/,
      async (originalAaisEventType, aisEventType) => {
        await sendSQSEvent(testUserId, originalAaisEventType);
        await timeDelayForTestEnvironment(500);
        await sendSQSEvent(testUserId, aisEventType);
      },
    );

    when(
      /^I invoke the API to retrieve the intervention status of the user's account. With history (.*)$/,
      async (historyValue) => {
        await timeDelayForTestEnvironment(1500);
        response = await invokeGetAccountState(testUserId, historyValue);
      },
    );

    then(
      /^I expect the intervention to be (.*), with the following state settings (.*), (.*), (.*) and (.*)$/,
      async (
        interventionType: string,
        blockedState: string,
        suspendedState: string,
        resetPassword: string,
        reproveIdentity: string,
      ) => {
        console.log(`Received`, { response });
        expect(response.intervention.description).toBe(interventionType);
        expect(response.intervention.state.blocked).toBe(JSON.parse(blockedState));
        expect(response.intervention.state.suspended).toBe(JSON.parse(suspendedState));
        expect(response.intervention.state.resetPassword).toBe(JSON.parse(resetPassword));
        expect(response.intervention.state.reproveIdentity).toBe(JSON.parse(reproveIdentity));
      },
    );
  });

  test('Happy Path - Field Validation - Get Request to /ais/userId - Returns Expected Data for <aisEventType> with specific field validation', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send a invalid request to sqs queue with no userId and (.*), (.*) data$/,
      async function (aisEventType, testUserId) {
        const userId = testUserId === 'undefined' ? undefined : testUserId;
        await sendSQSEvent(userId, aisEventType);
      },
    );

    when(/^I invoke apiGateway to retreive the status of the invalid userId with (.*)$/, async (historyValue) => {
      response = await invokeGetAccountState(testUserId, historyValue);
    });

    then(/^I should receive the appropriate (.*) for the ais endpoint$/, async (interventionType) => {
      console.log(`Received`, { response });
      expect(response.intervention.description).toBe(interventionType);
    });
  });

  test('Happy Path - Logs Validation', ({ given, when, then }) => {
    given('Cloudwatch logs have been created', async () => {
      events = await filterCloudWatchLogs(startTime);
    });

    when('log events messages contain a userId', () => {
      messages = events.map((event) => {
        let message;
        if (event.message) {
          try {
            message = JSON.parse(event.message) as EventMessage;
          } catch {
            message = event.message;
          }
        }
        return message;
      });

      messages = messages.filter((message) => message && message.hasOwnProperty('userId'));
    });

    then('the log events should also contain the message prefix sensitive info', () => {
      messages = messages.filter(
        (message) => message && typeof message !== 'string' && !message.message?.startsWith('Sensitive info'),
      );
      expect(messages).toHaveLength(0);
    });
  });
});
