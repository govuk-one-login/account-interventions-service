import { defineFeature, loadFeature } from 'jest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { sendSQSEvent } from '../../../utils/send-sqs-message';
import { invokeApiGateWayLambda } from '../../../utils/invoke-apigateway-lambda';

const feature = loadFeature('tests/resources/features/vcsGET/invokeApiGateway-HappyPath.feature');

defineFeature(feature, (test) => {
  let testUserId: string;
  let response:any

  beforeEach(() => {
    testUserId = generateRandomTestUserId();
  });

  test('Happy Path - Get Request to /ais/userId - Returns Data for a userId', ({ given, when, then }) => {
    given(/^I send a request to sqs queue with (.*) data$/, async (aisType) => {
      await sendSQSEvent(testUserId, aisType);
    });

    when(/^I invoke apiGateway to retreive the status of the userId with (.*)$/, async (historyValue) => {
      response = await invokeApiGateWayLambda(testUserId, historyValue);
    });

    then(/^I should receive the appropriate (.*) for the ais endpoint$/, async (interventionType) => {
      const responseInJson = await JSON.parse(await JSON.parse(await response).body);
      expect(await responseInJson.intervention.history[0].intervention).toContain(interventionType);
      expect(await responseInJson.intervention.state.blocked).toBe(false);
      expect(await responseInJson.intervention.state.suspended).toBe(true);
      expect(await responseInJson.intervention.state.resetPassword).toBe(true);
      expect(await responseInJson.intervention.state.reproveIdentity).toBe(false);
    });
  });
});
