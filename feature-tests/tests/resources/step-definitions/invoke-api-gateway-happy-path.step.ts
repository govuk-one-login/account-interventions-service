import { defineFeature, loadFeature } from 'jest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { sendSQSEvent } from '../../../utils/send-sqs-message';
import { invokeGetAccountState } from '../../../utils/invoke-apigateway-lambda';
import { timeDelayForTestEnvironment } from '../../../utils/utility';

const feature = loadFeature('./tests/resources/features/aisGET/InvokeApiGateWay-HappyPath.feature');

defineFeature(feature, (test) => {
  let testUserId: string;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let response: any;

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
        expect(response.state.blocked).toBe(JSON.parse(blockedState));
        expect(response.state.suspended).toBe(JSON.parse(suspendedState));
        expect(response.state.resetPassword).toBe(JSON.parse(resetPassword));
        expect(response.state.reproveIdentity).toBe(JSON.parse(reproveIdentity));
        expect(response.auditLevel).toBe('standard');
      },
    );
  });

  test('Happy Path - <originalAisEventType> account - Get Request to /ais/userId - Returns Expected Data for <aisEventType>', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send an (.*) intervention message to the TxMA ingress SQS queue for a Account in (.*) state$/,
      async (aisEventType, originalAisEventType) => {
        console.log('sending first message to put the user in : ' + originalAisEventType);
        await sendSQSEvent(testUserId, originalAisEventType);
        await timeDelayForTestEnvironment(500);
        console.log('sending second message to put the user in : ' + aisEventType);
        await sendSQSEvent(testUserId, aisEventType);
      },
    );

    when(
      /^I invoke the API to retrieve the intervention status of the user's account. With history (.*)$/,
      async (historyValue) => {
        await timeDelayForTestEnvironment(500);
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
        expect(response.state.blocked).toBe(JSON.parse(blockedState));
        expect(response.state.suspended).toBe(JSON.parse(suspendedState));
        expect(response.state.resetPassword).toBe(JSON.parse(resetPassword));
        expect(response.state.reproveIdentity).toBe(JSON.parse(reproveIdentity));
        expect(response.auditLevel).toBe('standard');
      },
    );
  });

  test('Happy Path - <originalAisEventType> account - Get Request to /ais/userId - Returns Expected Data for <aisEventType> with History values', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send an updated request to the SQS queue with intervention data of the type (.*) from (.*)$/,
      async (aisEventType, originalAisEventType) => {
        console.log('sending first message to put the user in : ' + originalAisEventType);
        await sendSQSEvent(testUserId, originalAisEventType);
        await timeDelayForTestEnvironment(1500);
        console.log('sending second message to put the user in : ' + aisEventType);
        await sendSQSEvent(testUserId, aisEventType);
      },
    );

    when(
      /^I invoke the API to retrieve the intervention status of the user's account with (.*)$/,
      async (historyValue) => {
        await timeDelayForTestEnvironment(500);
        response = await invokeGetAccountState(testUserId, historyValue);
      },
    );

    then(
      /^I expect the intervention to be (.*), with the following history values with (.*), (.*), (.*), (.*)$/,
      async (
        interventionType: string,
        componentHistory: string,
        interventionCodeHistory: string,
        interventionHistory: string,
        reason: string,
      ) => {
        console.log(`Received History`, response.history);
        expect(response.intervention.description).toBe(interventionType);
        expect(response.auditLevel).toBe('standard');
        expect(response.history.at(-1).component).toBe(componentHistory);
        expect(response.history.at(-1).code).toBe(interventionCodeHistory);
        expect(response.history.at(-1).intervention).toBe(interventionHistory);
        expect(response.history.at(-1).reason).toBe(reason);
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
      expect(response.auditLevel).toBe('standard');
    });
  });
});
