import { defineFeature, loadFeature } from 'jest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { sendSQSEvent } from '../../../utils/send-sqs-message';
import { invokeGetAccountState } from '../../../utils/invoke-apigateway-lambda';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import { aisEventResponse } from '../../../utils/ais-events-responses';

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
      /^I expect the response with all the valid state flags for (.*)$/,
      async (aisEventType: keyof typeof aisEventResponse) => {
        console.log(`Received`, { response });
        const eventTypes = ['unSuspendAction', 'unblock'];
        if (eventTypes.includes(aisEventType)) {
          expect(response.intervention.description).toBe('AIS_NO_INTERVENTION');
        } else {
          expect(response.intervention.description).toBe(aisEventResponse[aisEventType].description);
        }
        expect(response.state.blocked).toBe(aisEventResponse[aisEventType].blocked);
        expect(response.state.suspended).toBe(aisEventResponse[aisEventType].suspended);
        expect(response.state.resetPassword).toBe(aisEventResponse[aisEventType].resetPassword);
        expect(response.state.reproveIdentity).toBe(aisEventResponse[aisEventType].reproveIdentity);
        expect(response.auditLevel).toBe(aisEventResponse[aisEventType].auditLevel);
      },
    );
  });

  test('Happy Path - Get Request to /ais/userId - allowable Transition from <originalAisEventType> to <allowableAisEventType> - Return expected data', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send an (.*) intervention message to the TxMA ingress SQS queue for a Account in (.*) state$/,
      async (allowableAisEventType, originalAisEventType) => {
        console.log('sending first message to put the user in : ' + originalAisEventType);
        await sendSQSEvent(testUserId, originalAisEventType);
        await timeDelayForTestEnvironment(500);
        console.log('sending second message to put the user in : ' + allowableAisEventType);
        await sendSQSEvent(testUserId, allowableAisEventType);
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
      /^I expect the response with all the valid state fields for the (.*)$/,
      async (allowableAisEventType: keyof typeof aisEventResponse) => {
        console.log(`Received`, { response });
        expect(response.intervention.description).toBe(aisEventResponse[allowableAisEventType].description);
        expect(response.state.blocked).toBe(aisEventResponse[allowableAisEventType].blocked);
        expect(response.state.suspended).toBe(aisEventResponse[allowableAisEventType].suspended);
        expect(response.state.resetPassword).toBe(aisEventResponse[allowableAisEventType].resetPassword);
        expect(response.state.reproveIdentity).toBe(aisEventResponse[allowableAisEventType].reproveIdentity);
        expect(response.auditLevel).toBe(aisEventResponse[allowableAisEventType].auditLevel);
      },
    );
  });

  test('Happy Path - Get Request to /ais/userId - non-allowable Transition from <originalAisEventType> to <nonAllowableAisEventType> - Returns expected data', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send an (.*) intervention message to the TxMA ingress SQS queue for a Account in (.*) state$/,
      async (nonAllowableAisEventType, originalAisEventType) => {
        console.log('sending first message to put the user in : ' + originalAisEventType);
        await sendSQSEvent(testUserId, originalAisEventType);
        await timeDelayForTestEnvironment(500);
        console.log('sending second message to put the user in : ' + nonAllowableAisEventType);
        await sendSQSEvent(testUserId, nonAllowableAisEventType);
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
      /^I expect the response with all the valid state fields for the (.*)$/,
      async (originalAisEventType: keyof typeof aisEventResponse) => {
        console.log(`Received`, { response });
        expect(response.intervention.description).toBe(aisEventResponse[originalAisEventType].description);
        expect(response.state.blocked).toBe(aisEventResponse[originalAisEventType].blocked);
        expect(response.state.suspended).toBe(aisEventResponse[originalAisEventType].suspended);
        expect(response.state.resetPassword).toBe(aisEventResponse[originalAisEventType].resetPassword);
        expect(response.state.reproveIdentity).toBe(aisEventResponse[originalAisEventType].reproveIdentity);
        expect(response.auditLevel).toBe(aisEventResponse[originalAisEventType].auditLevel);
      },
    );
  });

  test('Happy Path - Get Request to /ais/userId - non-allowable Transition from <originalAisEventType> to <nonAllowableAisEventType> - Get Request to /ais/userId - Returns expected data with diff flags', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send an (.*) intervention message to the TxMA ingress SQS queue for a Account in (.*) state$/,
      async (nonAllowableAisEventType, originalAisEventType) => {
        console.log('sending first message to put the user in : ' + originalAisEventType);
        await sendSQSEvent(testUserId, originalAisEventType);
        await timeDelayForTestEnvironment(500);
        console.log('sending second message to put the user in : ' + nonAllowableAisEventType);
        await sendSQSEvent(testUserId, nonAllowableAisEventType);
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
      /^I expect response with valid fields for (.*) with state flags as (.*), (.*), (.*) and (.*)$/,
      async (
        interventionType:string,
        blocked:string,
        suspended:string,
        resetPassword:string,
        reproveIdentity:string
        ) => {
        console.log(`Received`, { response });
        expect(response.intervention.description).toBe(interventionType);
        expect(response.state.blocked).toBe(JSON.parse(blocked));
        expect(response.state.suspended).toBe(JSON.parse(suspended));
        expect(response.state.resetPassword).toBe(JSON.parse(resetPassword));
        expect(response.state.reproveIdentity).toBe(JSON.parse(reproveIdentity));
        expect(response.auditLevel).toBe('standard');
      },
    );
  });

  test('Happy Path - Get Request to /ais/userId - allowable Transition from <originalAisEventType> to <allowableAisEventType> - Get Request to /ais/userId - Returns expected data with history values', ({
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
      /^I expect the response with history values for the (.*)$/,
      async (aisEventType: keyof typeof aisEventResponse) => {
        console.log(`Received History`, response.history);
        expect(response.intervention.description).toBe(aisEventResponse[aisEventType].description);
        expect(response.history.at(-1).component).toBe(aisEventResponse[aisEventType].componentHistory);
        expect(response.history.at(-1).code).toBe(aisEventResponse[aisEventType].interventionCodeHistory);
        expect(response.history.at(-1).intervention).toBe(aisEventResponse[aisEventType].interventionHistory);
        expect(response.history.at(-1).reason).toBe(aisEventResponse[aisEventType].reason);
        expect(response.auditLevel).toBe(aisEventResponse[aisEventType].auditLevel);
      },
    );
  });

  test('Happy Path - Get Request to /ais/userId - Field Validation - Returns Expected Data for <aisEventType> with specific field validation', ({
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

  test('Happy Path - Get Request to /ais/userId - Multiple Transitions from one event type to other event types', ({
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
});
