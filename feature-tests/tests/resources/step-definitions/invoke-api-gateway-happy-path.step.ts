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

  test('Happy Path - Field Validation - Get Request to /ais/userId -  Multiple Transitions from one event type to other event types', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send a multiple requests to sqs queue to transit from one event type to other event types with single userId$/,
      async function () {
        console.log('sending first message to put the user in : passwordResetRequired');
        await sendSQSEvent(testUserId, `pswResetRequired`);

        await timeDelayForTestEnvironment(500);
        console.log('sending second message to put the user in : suspendNoAction');
        await sendSQSEvent(testUserId, `suspendNoAction`);

        await timeDelayForTestEnvironment(500);
        console.log('sending third message to put the user in : idResetRequired');
        await sendSQSEvent(testUserId, `idResetRequired`);

        await timeDelayForTestEnvironment(500);
        console.log('sending fourth message to put the user in : pswAndIdResetRequired');
        await sendSQSEvent(testUserId, `pswAndIdResetRequired`);

        await timeDelayForTestEnvironment(500);
        console.log('sending fifth message to put the user in : block');
        await sendSQSEvent(testUserId, `block`);

        await timeDelayForTestEnvironment(500);
        console.log('sending sixth message to put the user in : unblock');
        await sendSQSEvent(testUserId, `unblock`);
      },
    );

    when(/^I invoke apiGateway to retreive the status of the valid userId with history as true$/, async () => {
      await timeDelayForTestEnvironment(500);
      response = await invokeGetAccountState(testUserId, true);
    });

    then(/^I should receive every transition event history data in the response for the ais endpoint$/, async () => {
      expect(response.auditLevel).toBe('standard');
      console.log(`Received History`, response.history);
      expect(response.history.length === 6);
      expect(response.intervention.description).toBe(`AIS_ACCOUNT_UNBLOCKED`);
      expect(response.history.at(0).intervention).toBe(`FRAUD_FORCED_USER_PASSWORD_RESET`);
      expect(response.history.at(1).intervention).toBe(`FRAUD_SUSPEND_ACCOUNT`);
      expect(response.history.at(2).intervention).toBe(`FRAUD_FORCED_USER_IDENTITY_REVERIFICATION`);
      expect(response.history.at(3).intervention).toBe(`FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION`);
      expect(response.history.at(4).intervention).toBe(`FRAUD_BLOCK_ACCOUNT`);
      expect(response.history.at(5).intervention).toBe(`FRAUD_UNBLOCK_ACCOUNT`);
      expect(response.history.at(-1).intervention).toBe(`FRAUD_UNBLOCK_ACCOUNT`);
      expect(response.auditLevel).toBe('standard');
    });
  });

  test('Happy Path - Field Validation - Get Request to /ais/userId -  Multiple Transitions from one event type to other event types', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send a multiple requests to sqs queue to transit from one event type to other event types with single userId$/,
      async function () {
        console.log('sending first message to put the user in : passwordResetRequired');
        await sendSQSEvent(testUserId, `pswResetRequired`);
        // response = await invokeGetAccountState(testUserId, true);
        // expect(response.intervention.description).toBe(`AIS_FORCED_USER_PASSWORD_RESET`);

        await timeDelayForTestEnvironment(500);
        console.log('sending second message to put the user in : suspendNoAction');
        await sendSQSEvent(testUserId, `suspendNoAction`);
        // response = await invokeGetAccountState(testUserId, true);
        // expect(response.intervention.description).toBe(`AIS_ACCOUNT_SUSPENDED`);

        await timeDelayForTestEnvironment(500);
        console.log('sending third message to put the user in : idResetRequired');
        await sendSQSEvent(testUserId, `idResetRequired`);
        // response = await invokeGetAccountState(testUserId, true);
        // expect(response.intervention.description).toBe(`AIS_FORCED_USER_IDENTITY_VERIFY`);

        await timeDelayForTestEnvironment(500);
        console.log('sending fourth message to put the user in : pswAndIdResetRequired');
        await sendSQSEvent(testUserId, `pswAndIdResetRequired`);
        // response = await invokeGetAccountState(testUserId, true);
        // expect(response.intervention.description).toBe(`AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY`);

        await timeDelayForTestEnvironment(500);
        console.log('sending fifth message to put the user in : block');
        await sendSQSEvent(testUserId, `block`);
        // response = await invokeGetAccountState(testUserId, true);
        // expect(response.intervention.description).toBe(`AIS_ACCOUNT_BLOCKED`);

        await timeDelayForTestEnvironment(500);
        console.log('sending sixth message to put the user in : unblock');
        await sendSQSEvent(testUserId, `unblock`);
        // response = await invokeGetAccountState(testUserId, true);
        // expect(response.intervention.description).toBe(`AIS_ACCOUNT_UNBLOCKED`);
      },
    );

    when(/^I invoke an apiGateway to retreive the status of the invalid userId with history as true$/, async () => {
      await timeDelayForTestEnvironment(500);
      response = await invokeGetAccountState(testUserId, true);
    });

    then(/^I should receive every transition event history data in the response for the ais endpoint$/, async () => {
      expect(response.auditLevel).toBe('standard');
      console.log(`Received History`, response.history);
      expect(response.history.length === 6);
      expect(response.intervention.description).toBe(`AIS_ACCOUNT_UNBLOCKED`);
      expect(response.history.at(3).intervention).toBe(`FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION`);
      expect(response.history.at(4).intervention).toBe(`FRAUD_BLOCK_ACCOUNT`);
      expect(response.history.at(5).intervention).toBe(`FRAUD_UNBLOCK_ACCOUNT`);
      expect(response.auditLevel).toBe('standard');
    });
  });

  test('Happy Path - Field Validation - Get Request to /ais/userId -  Multiple Transitions from one event type to other event types', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send a multiple requests to sqs queue to transit from one event type to other event types with single userId$/,
      async function () {
        console.log('sending first message to put the user in : passwordResetRequired');
        await sendSQSEvent(testUserId, `pswResetRequired`);
        // response = await invokeGetAccountState(testUserId, true);
        // expect(response.intervention.description).toBe(`AIS_FORCED_USER_PASSWORD_RESET`);

        await timeDelayForTestEnvironment(500);
        console.log('sending second message to put the user in : suspendNoAction');
        await sendSQSEvent(testUserId, `suspendNoAction`);

        await timeDelayForTestEnvironment(500);
        console.log('sending third message to put the user in : idResetRequired');
        await sendSQSEvent(testUserId, `idResetRequired`);

        await timeDelayForTestEnvironment(500);
        console.log('sending fourth message to put the user in : pswAndIdResetRequired');
        await sendSQSEvent(testUserId, `pswAndIdResetRequired`);

        await timeDelayForTestEnvironment(500);
        console.log('sending fifth message to put the user in : block');
        await sendSQSEvent(testUserId, `block`);

        await timeDelayForTestEnvironment(500);
        console.log('sending sixth message to put the user in : unblock');
        await sendSQSEvent(testUserId, `unblock`);
      },
    );

    when(/^I invoke an apiGateway to retreive the status of the invalid userId with history as true$/, async () => {
      await timeDelayForTestEnvironment(500);
      response = await invokeGetAccountState(testUserId, true);
    });

    then(/^I should receive every transition event history data in the response for the ais endpoint$/, async () => {
      expect(response.auditLevel).toBe('standard');
      console.log(`Received History`, response.history);
      expect(response.history.length === 6);
      expect(response.intervention.description).toBe(`AIS_ACCOUNT_UNBLOCKED`);
      expect(response.history.at(0).intervention).toBe(`FRAUD_FORCED_USER_PASSWORD_RESET`);
      expect(response.history.at(1).intervention).toBe(`FRAUD_SUSPEND_ACCOUNT`);
      expect(response.history.at(2).intervention).toBe(`FRAUD_FORCED_USER_IDENTITY_REVERIFICATION`);
      expect(response.history.at(3).intervention).toBe(`FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION`);
      expect(response.history.at(4).intervention).toBe(`FRAUD_BLOCK_ACCOUNT`);
      expect(response.history.at(5).intervention).toBe(`FRAUD_UNBLOCK_ACCOUNT`);
      expect(response.history.at(-1).intervention).toBe(`FRAUD_UNBLOCK_ACCOUNT`);
      expect(response.auditLevel).toBe('standard');
    });
  });
});
