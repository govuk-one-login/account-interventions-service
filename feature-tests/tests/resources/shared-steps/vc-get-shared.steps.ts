/* eslint unicorn/no-null: 0 */
import request from 'supertest';
import EndPoints from '../../../apiEndpoints/endpoints';
import type { StepDefinitions } from 'jest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { getApiKey } from '../../../utils/get-api-key';

let apiKey: string;
let getVCsResponse: any;
let testUserId: any;

export const getVCsForUserId: StepDefinitions = ({ given, when, then, and }) => {
  given('I created a valid userId', async () => {
    testUserId = generateRandomTestUserId();
  });

  given(/^I obtained an api key$/, async () => {
    apiKey = await getApiKey();
    expect(typeof apiKey).toEqual('string');
    expect(apiKey.trim()).toBeTruthy();
  });

  given(/^I send a request to sqs queue with specific data$/, async () => {
    
  });

  when(
    /^I send a GET request with (.*) and (.*) to the GET ais endpoint$/,
    async (contentType: string, accept: string) => {
      getVCsResponse = await request('https://account-interventions-service.credential-store.dev.account.gov.uk')
        .get(EndPoints.INTERVENTIONS_PATH + testUserId)
        .set('x-api-key', apiKey)
        .set('Content-Type', contentType)
        .set('Accept', accept);
      console.log('GET Responses Body = ' + JSON.stringify(getVCsResponse, undefined, 2));
    },
  );

  then(/^I should receive the appropriate (.*) and (.*) for the ais endpoint$/, async (statusCode, response) => {
    
  });
};
