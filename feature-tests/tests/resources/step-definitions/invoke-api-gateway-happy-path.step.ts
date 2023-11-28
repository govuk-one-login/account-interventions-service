import { defineFeature, loadFeature } from 'jest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { sendSQSEvent } from '../../../utils/send-sqs-message';
import { invokePrivateApiGateWayAndLambdaFunction } from '../../../utils/invoke-apigateway-lambda';
import { timeDelayForTestEnvironment } from '../../../utils/utility';

const feature = loadFeature('./tests/resources/features/aisGET/InvokeApiGateWay-HappyPath.feature');

defineFeature(feature, (test) => {
  let testUserId: string;
  let response: any;

  beforeEach(() => {
    testUserId = generateRandomTestUserId();
  });

  test('Happy Path - Get Request to /ais/userId - Returns Data for a userId', ({ given, when, then }) => {
    given(/^I send a request to sqs queue with (.*) data$/, async (aisEventType) => {
      await sendSQSEvent(testUserId, aisEventType);
    });

    when(/^I invoke apiGateway to retreive the status of the userId with (.*)$/, async (historyValue) => {
      await timeDelayForTestEnvironment(500);
      response = await invokePrivateApiGateWayAndLambdaFunction(testUserId, historyValue);
      console.log(`${response}`);
    });

    then(
      /^I should receive the appropriate (.*), (.*), (.*), (.*) and (.*) for the ais endpoint$/,
      async (
        interventionType: string,
        blockedState: string,
        suspendedState: string,
        resetPassword: string,
        reproveIdentity: string,
      ) => {
        console.log(`Expected`, { interventionType, blockedState, suspendedState, resetPassword, reproveIdentity });
        console.log(`Response: ${response}`, { response });
        expect(response.intervention.description).toContain(interventionType);
        expect(response.intervention.state.blocked).toEqual(JSON.parse(blockedState));
        expect(response.intervention.state.suspended).toEqual(JSON.parse(suspendedState));
        expect(response.intervention.state.resetPassword).toEqual(JSON.parse(resetPassword));
        expect(response.intervention.state.reproveIdentity).toEqual(JSON.parse(reproveIdentity));
      },
    );
  });
});
