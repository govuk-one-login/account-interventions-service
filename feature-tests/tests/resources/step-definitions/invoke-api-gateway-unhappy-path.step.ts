import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { sendInvalidSQSEvent, sendSQSEvent } from '../../../utils/send-sqs-message';
import { invokeGetAccountState } from '../../../utils/invoke-apigateway-lambda';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import EndPoints from '../../../apiEndpoints/endpoints';
import request from 'supertest';
import { App } from 'supertest/types';
import { AisResponseType } from '../../../utils/ais-events-responses';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';

const feature = await loadFeature('./tests/resources/features/aisGET/InvokeApiGateWay-UnHappyPath.feature');

describeFeature(feature, ({ ScenarioOutline, BeforeEachScenario }) => {
  let testUserId: string;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let response: AisResponseType;

  BeforeEachScenario(() => {
    testUserId = generateRandomTestUserId();
  });

  ScenarioOutline(
    'UnHappy Path - Get Request to /ais/userId - Returns Expected data for <invalidAisEventType>',
    ({ Given, When, Then }, { invalidAisEventType, description }) => {
      Given('I send invalid <invalidAisEventType> intervention message to the TxMA ingress SQS queue', async () => {
        await sendInvalidSQSEvent(testUserId, invalidAisEventType);
      });

      When('I invoke the API to retrieve the intervention status of the account', async () => {
        await timeDelayForTestEnvironment();
        response = await invokeGetAccountState(testUserId, true);
        console.log(`Received`, { response });
      });

      Then('I expect response with no intervention <description>', async () => {
        console.log(`Received`, { response });
        expect(response.intervention.description).toBe(description);
      });
    },
  );

  ScenarioOutline(
    'UnHappy Path - Get Request to /ais/userId - Field Validation - Returns Expected Data for <aisEventType> with specific field validation',
    ({ Given, When, Then }, { aisEventType, historyValue, interventionType, userId }) => {
      Given('I send a invalid request to sqs queue with no userId and <aisEventType>, <userId> data', async () => {
        await sendSQSEvent(userId === 'undefined' ? undefined : userId, aisEventType);
      });

      When('I invoke apiGateway to retreive the status of the invalid userId with <historyValue>', async () => {
        await timeDelayForTestEnvironment();
        response = await invokeGetAccountState(testUserId, historyValue);
        console.log(`Received`, { response });
      });

      Then('I should receive the appropriate <interventionType> for the ais endpoint', async () => {
        expect(response.intervention.description).toBe(interventionType);
        expect(response.auditLevel).toBe('standard');
      });
    },
  );

  ScenarioOutline(
    'UnHappy Path - Get Request to /ais/userId - Invalid Base URL - Returns Expected Data for <aisEventType>',
    ({ Given, When, Then }, { aisEventType, message }) => {
      Given('I send a valid request to sqs queue with userId and <aisEventType>', async function () {
        if (process.platform === 'linux' && !process.env['USE_PRIVATE_API_GATEWAY']) {
          await sendSQSEvent(testUserId, aisEventType);
        }
      });

      When('I invoke apiGateway with invalid base url to retreive the status of the userId', async () => {
        if (process.platform === 'linux' && !process.env['USE_PRIVATE_API_GATEWAY']) {
          const resultFromAPI = await request((EndPoints.AIS_BASE_URL + '/k') as unknown as App)
            .get(EndPoints.PATH_AIS + testUserId)
            .query({ history: false })
            .set('Content-Type', 'application/json')
            .set('Accept', '*/*');
          response = JSON.parse(resultFromAPI.text);
        }
      });

      Then('I should receive the response with <message> for the invalid base url', async () => {
        if (process.platform === 'linux' && !process.env['USE_PRIVATE_API_GATEWAY']) {
          expect(response.message).toBe(message);
        }
      });
    },
  );

  ScenarioOutline(
    'UnHappy Path - Get Request to /ais/userId - Invalid Endpoint - Returns Expected Data for <aisEventType>',
    ({ Given, When, Then }, { aisEventType, message }) => {
      Given('I send a valid request to sqs queue with <aisEventType>', async () => {
        if (process.platform === 'linux' && !process.env['USE_PRIVATE_API_GATEWAY']) {
          await sendSQSEvent(testUserId, aisEventType);
        }
      });

      When('I invoke apiGateway with invalid endpoint to retreive the status of the userId', async () => {
        if (process.platform === 'linux' && !process.env['USE_PRIVATE_API_GATEWAY']) {
          const resultFromAPI = await request(EndPoints.AIS_BASE_URL as unknown as App)
            .get(EndPoints.PATH_AIS + '/' + testUserId)
            .query({ history: false })
            .set('Content-Type', 'application/json')
            .set('Accept', '*/*');
          response = JSON.parse(resultFromAPI.text);
        }
      });

      Then('I should receive response with <message> for the ais endpoint', async () => {
        if (process.platform === 'linux' && !process.env['USE_PRIVATE_API_GATEWAY']) {
          expect(response.message).toBe(message);
        }
      });
    },
  );

  ScenarioOutline(
    'UnHappy Path - Get Request to /ais/userId - Invalid Content-Type & Accept - Returns Expected Data for <aisEventType>',
    ({ Given, When, Then }, { aisEventType, contentType, accept, message }) => {
      Given('I send an valid request to sqs queue with <aisEventType>', async () => {
        if (process.platform === 'linux' && !process.env['USE_PRIVATE_API_GATEWAY']) {
          await sendSQSEvent(testUserId, aisEventType);
        }
      });

      When(
        'I invoke apiGateway with invalid <contentType> and <accept> to retreive the status of the userId',
        async () => {
          if (process.platform === 'linux' && !process.env['USE_PRIVATE_API_GATEWAY']) {
            const resultFromAPI = await request(EndPoints.AIS_BASE_URL as unknown as App)
              .get(EndPoints.PATH_AIS + '/' + testUserId)
              .query({ history: false })
              .set('Content-Type', contentType)
              .set('Accept', accept);
            response = JSON.parse(resultFromAPI.text);
          }
        },
      );

      Then('I should receive the response with <message>', async () => {
        if (process.platform === 'linux' && !process.env['USE_PRIVATE_API_GATEWAY']) {
          expect(response.message).toBe(message);
        }
      });
    },
  );

  ScenarioOutline(
    'UnHappy Path - Get Request to /ais/userId - Mixed Case History values - Returns Expected Data for <aisEventType>',
    ({ Given, When, Then }, { aisEventType, historyValue }) => {
      Given('I send an valid <aisEventType> request to sqs queue', async () => {
        await sendSQSEvent(testUserId, aisEventType);
      });

      When('I invoke apiGateway to retreive the status userId with <historyValue>', async () => {
        await timeDelayForTestEnvironment();
        response = await invokeGetAccountState(testUserId, historyValue);
      });

      Then('I should receive the response with no history items for the ais endpoint', async () => {
        expect(response.history).toBeFalsy();
      });
    },
  );

  ScenarioOutline(
    'UnHappy Path - Get Request to /ais/userId - Identity Status for userActionIdResetSuccess - Returns Expected Data for <aisEventType>',
    ({ Given, When, And, Then }, { aisEventType, invalidAisEventType }) => {
      Given('I send a valid request with event <aisEventType> to the sqs queue', async () => {
        await sendSQSEvent(testUserId, aisEventType);
      });

      And('I send an other invalid event with invalid status <invalidAisEventType> to the txma sqs queue', async () => {
        await timeDelayForTestEnvironment();
        await sendInvalidSQSEvent(testUserId, invalidAisEventType);
      });

      When('I invoke an apiGateway to retreive the status of the userId', async () => {
        await timeDelayForTestEnvironment();
        response = await invokeGetAccountState(testUserId, true);
      });

      Then('I should receive the response without the reprovedIdentityAt value', async () => {
        expect(response.intervention.reproveIdentityAt).toBeFalsy();
      });
    },
  );
});
