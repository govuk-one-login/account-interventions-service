import { defineFeature, loadFeature } from 'jest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { getApiKey } from '../../../utils/get-api-key';
import request from 'supertest';
import EndPoints from '../../../apiEndpoints/endpoints';

const feature = loadFeature('tests/resources/features/vcsGET/vcsGetUserId-HappyPath.feature');

defineFeature(feature, test => {
  let testUserId:string;
  let apiKey:any;
  let getVCsResponse;

  beforeEach(() => {
    testUserId = generateRandomTestUserId();
    apiKey = getApiKey();
  });

  test('Happy Path - Get Request to /ais/userId - Returns Data for a userId', ({ given, when, then }) => {
    given(/^I send a request to sqs queue with specific data$/, async => {
      
    });

    when(/^I send a GET request with (.*) and (.*) to the GET ais endpoint$/, async(contentType, accept) => {
        getVCsResponse = await request('https://account-interventions-service.credential-store.dev.account.gov.uk')
        .get(EndPoints.INTERVENTIONS_PATH + testUserId)
        .set('x-api-key', apiKey)
        .set('Content-Type', contentType)
        .set('Accept', accept);
      console.log('GET Responses Body = ' + JSON.stringify(getVCsResponse, undefined, 2));
    });

    then(/^I should receive the appropriate (.*) and (.*) for the ais endpoint$/, async(statusCode, response) => {
      
    });
  });

  test('Happy Path - Get Request to /ais/userId - Returns Data for a userId', ({ given, when, then }) => {
    given(/^I send a request to sqs queue with specific data$/, async => {
      
    });

    when(/^I send a GET request with (.*) and (.*) to the GET ais endpoint$/, async(contentType, accept) => {

    });

    then(/^I should receive the appropriate (.*) and (.*) for the ais endpoint$/, async(statusCode, response) => {
      
    });
  });

});