import { defineFeature, loadFeature } from 'jest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { sendSQSEvent } from '../../../utils/send-sqs-message';
import { invokeApiGateWayLambda } from '../../../utils/invoke-apigateway-lambda';

const feature = loadFeature('tests/resources/features/vcsGET/vcsGetUserId-HappyPath.feature');

defineFeature(feature, (test) => {
  let testUserId: string;

  beforeEach(() => {
    testUserId = generateRandomTestUserId();
  });

  test('Happy Path - Get Request to /ais/userId - Returns Data for a userId', ({ given, when, then }) => {
    given(/^I send a request to sqs queue with (.*) data$/, async (aisType) => {
      await sendSQSEvent(testUserId, aisType);
    });

    when(/^I invoke apiGateway to retreive the status of the userId with (.*)$/, async (history) => {
      await invokeApiGateWayLambda(testUserId, history);
    });

    then(/^I should receive the appropriate (.*) and (.*) for the ais endpoint$/, async (statusCode, response) => {});
  });
});
