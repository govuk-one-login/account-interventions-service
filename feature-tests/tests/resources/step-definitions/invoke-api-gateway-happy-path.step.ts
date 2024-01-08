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

  // test('Happy Path - Get Request to /ais/userId - Returns Expected Data for <aisEventType>', ({
  //   given,
  //   when,
  //   then,
  // }) => {
  //   given(/^I send an (.*) intervention message to the TxMA ingress SQS queue$/, async (aisEventType) => {
  //     await sendSQSEvent(testUserId, aisEventType);
  //   });
  //
  //   when(
  //     /^I invoke the API to retrieve the intervention status of the user's account. With history (.*)$/,
  //     async (historyValue) => {
  //       await timeDelayForTestEnvironment(1500);
  //       response = await invokeGetAccountState(testUserId, historyValue);
  //     },
  //   );
  //
  //   then(
  //     /^I expect the intervention to be (.*), with the following state settings (.*), (.*), (.*) and (.*)$/,
  //     async (
  //       interventionType: string,
  //       blockedState: string,
  //       suspendedState: string,
  //       resetPassword: string,
  //       reproveIdentity: string,
  //     ) => {
  //       console.log(`Received`, { response });
  //       console.log(`Received History`,  response.intervention.history );
  //       expect(response.intervention.description).toBe(interventionType);
  //       expect(response.intervention.state.blocked).toBe(JSON.parse(blockedState));
  //       expect(response.intervention.state.suspended).toBe(JSON.parse(suspendedState));
  //       expect(response.intervention.state.resetPassword).toBe(JSON.parse(resetPassword));
  //       expect(response.intervention.state.reproveIdentity).toBe(JSON.parse(reproveIdentity));
  //     },
  //   );
  // });

  test('Happy Path - <aisEventType> account - Get Request to /ais/userId - Returns Expected Data for <originalAisEventType>', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send an (.*) intervention message to the TxMA ingress SQS queue for a Account in (.*) state$/,
      async (aisEventType, originalAisEventType) => {
        console.log('sending a message 1 to put the user in : ' + originalAisEventType);
        await sendSQSEvent(testUserId, originalAisEventType);
        await timeDelayForTestEnvironment(1000);
        console.log('sending a message 2 to put the user in : ' + aisEventType);
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

  // test('Happy Path - Field Validation - Get Request to /ais/userId - Returns Expected Data for <aisEventType> with specific field validation', ({
  //   given,
  //   when,
  //   then,
  // }) => {
  //   given(
  //     /^I send a invalid request to sqs queue with no userId and (.*), (.*) data$/,
  //     async function (aisEventType, testUserId) {
  //       const userId = testUserId === 'undefined' ? undefined : testUserId;
  //       await sendSQSEvent(userId, aisEventType);
  //     },
  //   );
  //
  //   when(/^I invoke apiGateway to retreive the status of the invalid userId with (.*)$/, async (historyValue) => {
  //     response = await invokeGetAccountState(testUserId, historyValue);
  //   });
  //
  //   then(/^I should receive the appropriate (.*) for the ais endpoint$/, async (interventionType) => {
  //     console.log(`Received`, { response });
  //     expect(response.intervention.description).toBe(interventionType);
  //   });
  // });
});
