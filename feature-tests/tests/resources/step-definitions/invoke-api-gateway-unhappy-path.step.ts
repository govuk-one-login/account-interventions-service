import { defineFeature, loadFeature } from 'jest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { sendInvalidSQSEvent, sendSQSEvent, filterUserIdInMessages } from '../../../utils/send-sqs-message';
import { invokeGetAccountState } from '../../../utils/invoke-apigateway-lambda';
import { attemptParseJSON, timeDelayForTestEnvironment } from '../../../utils/utility';
import EndPoints from '../../../apiEndpoints/endpoints';
import request from 'supertest';
import { App } from 'supertest/types';

const feature = loadFeature('./tests/resources/features/aisGET/InvokeApiGateWay-UnHappyPath.feature');

defineFeature(feature, (test) => {
  let testUserId: string;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let response: any;

  beforeEach(() => {
    testUserId = generateRandomTestUserId();
  });

  test('UnHappy Path - Get Request to /ais/userId - Returns Expected data for <invalidAisEventType>', ({
    given,
    when,
    then,
  }) => {
    given(/^I send invalid (.*) intervention message to the TxMA ingress SQS queue$/, async (invalidAisEventType) => {
      await sendInvalidSQSEvent(testUserId, invalidAisEventType);
    });

    when(/^I invoke the API to retrieve the intervention status of the account$/, async () => {
      await timeDelayForTestEnvironment(1500);
      response = await invokeGetAccountState(testUserId, true);
      console.log(`Received`, { response });
    });

    then(/^I expect response with no intervention (.*)$/, async (description) => {
      console.log(`Received`, { response });
      expect(response.intervention.description).toBe(description);
    });
  });

  test('UnHappy Path - Check Egress Queue Error messages for future time stamp - Returns Expected data for <invalidAisEventType>', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send an invalid (.*) intervention with future time stamp event message to the TxMA ingress SQS queue$/,
      async (eventType) => {
        await sendInvalidSQSEvent(testUserId, eventType);
      },
    );

    when(/^I invoke an API to retrieve the intervention status of the account$/, async () => {
      await timeDelayForTestEnvironment(1500);
      response = await invokeGetAccountState(testUserId, true);
      console.log(`Received`, { response });
    });

    then(/^I expect Egress Queue response with (.*)$/, async (eventName) => {
      const receivedMessage = await filterUserIdInMessages(testUserId);
      const body = receivedMessage[0].Body;
      const event_name = body ? attemptParseJSON(body).event_name : {};
      expect(event_name).toEqual(eventName);
    });
  });

  test('UnHappy Path - Check Egress Queue Error messages for Ignored event - Returns Expected data for <invalidAisEventType>', ({
    given,
    when,
    and,
    then,
  }) => {
    given(/^I send an valid (.*) intervention event message to the TxMA ingress SQS queue$/, async (aisEventType) => {
      await sendSQSEvent(testUserId, aisEventType);
    });

    when(/^I invoke an API to retrieve the intervention status of the account$/, async () => {
      await timeDelayForTestEnvironment(1500);
      response = await invokeGetAccountState(testUserId, true);
      console.log(`Received`, { response });
    });

    and(
      /^I send an other (.*) intervention with past time stamp to the TxMA ingress SQS queue$/,
      async (secondAisEventType) => {
        await timeDelayForTestEnvironment(1500);
        await sendInvalidSQSEvent(testUserId, secondAisEventType);
        console.log(`Received`, { response });
      },
    );

    then(/^I expect the Egress Queue response with (.*)$/, async (eventName) => {
      const receivedMessage = await filterUserIdInMessages(testUserId);
      const message = receivedMessage.find((object) => {
        const objectBody = object.Body ? attemptParseJSON(object.Body) : {};
        return objectBody.extensions?.description === 'AIS_NO_INTERVENTION';
      });
      const body = message?.Body ? attemptParseJSON(message?.Body) : {};
      expect(body.event_name).toEqual(eventName);
    });
  });

  test('UnHappy Path - Get Request to /ais/userId - Field Validation - Returns Expected Data for <aisEventType> with specific field validation', ({
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

  test('UnHappy Path - Get Request to /ais/userId - Invalid Base URL - Returns Expected Data for <aisEventType>', ({
    given,
    when,
    then,
  }) => {
    given(/^I send a valid request to sqs queue with userId and (.*)$/, async function (aisEventType) {
      if (process.platform === 'linux') {
        await sendSQSEvent(testUserId, aisEventType);
      }
    });

    when(/^I invoke apiGateway with invalid base url to retreive the status of the userId$/, async () => {
      if (process.platform === 'linux') {
        const resultFromAPI = await request((EndPoints.AIS_BASE_URL + '/k') as unknown as App)
          .get(EndPoints.PATH_AIS + testUserId)
          .query({ history: false })
          .set('Content-Type', 'application/json')
          .set('Accept', '*/*');
        response = JSON.parse(resultFromAPI.text);
      }
    });

    then(/^I should receive the response with (.*) for the invalid base url$/, async (message) => {
      if (process.platform === 'linux') {
        expect(response.message).toBe(message);
      }
    });
  });

  test('UnHappy Path - Get Request to /ais/userId - Invalid Endpoint - Returns Expected Data for <aisEventType>', ({
    given,
    when,
    then,
  }) => {
    given(/^I send a valid request to sqs queue with (.*)$/, async function (aisEventType) {
      if (process.platform === 'linux') {
        await sendSQSEvent(testUserId, aisEventType);
      }
    });

    when(/^I invoke apiGateway with invalid endpoint to retreive the status of the userId$/, async () => {
      if (process.platform === 'linux') {
        const resultFromAPI = await request(EndPoints.AIS_BASE_URL as unknown as App)
          .get(EndPoints.PATH_AIS + '/' + testUserId)
          .query({ history: false })
          .set('Content-Type', 'application/json')
          .set('Accept', '*/*');
        response = JSON.parse(resultFromAPI.text);
      }
    });

    then(/^I should receive response with (.*) for the ais endpoint$/, async (message) => {
      if (process.platform === 'linux') {
        expect(response.message).toBe(message);
      }
    });
  });

  test('UnHappy Path - Get Request to /ais/userId - Invalid Content-Type & Accept - Returns Expected Data for <aisEventType>', ({
    given,
    when,
    then,
  }) => {
    given(/^I send an valid request to sqs queue with (.*)$/, async function (aisEventType) {
      if (process.platform === 'linux') {
        await sendSQSEvent(testUserId, aisEventType);
      }
    });

    when(
      /^I invoke apiGateway with invalid (.*) and (.*) to retreive the status of the userId$/,
      async (contentType, accept) => {
        if (process.platform === 'linux') {
          const resultFromAPI = await request(EndPoints.AIS_BASE_URL as unknown as App)
            .get(EndPoints.PATH_AIS + '/' + testUserId)
            .query({ history: false })
            .set('Content-Type', contentType)
            .set('Accept', accept);
          response = JSON.parse(resultFromAPI.text);
        }
      },
    );

    then(/^I should receive the response with (.*)$/, async (message) => {
      if (process.platform === 'linux') {
        expect(response.message).toBe(message);
      }
    });
  });

  test('UnHappy Path - Get Request to /ais/userId - Mixed Case History values - Returns Expected Data for <aisEventType>', ({
    given,
    when,
    then,
  }) => {
    given(/^I send an valid (.*) request to sqs queue$/, async function (aisEventType) {
      await sendSQSEvent(testUserId, aisEventType);
    });

    when(/^I invoke apiGateway to retreive the status userId with (.*)$/, async (historyValue) => {
      await timeDelayForTestEnvironment(1500);
      response = await invokeGetAccountState(testUserId, historyValue);
    });

    then(/^I should receive the response with no history items for the ais endpoint$/, async () => {
      expect(response.history).toBeFalsy();
    });
  });
});
