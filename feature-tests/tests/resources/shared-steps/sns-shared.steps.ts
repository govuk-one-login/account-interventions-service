import { StepDefinitions } from 'jest-cucumber';
import { getArrayOfValidVcTokens } from '../../../utils/generate-valid-vc-tokens';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { getApiKey } from '../../../utils/get-api-key';
import { generateAuthorizationToken } from '../../../utils/generate-authorization-token';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import EndPoints from '../../../apiEndpoints/endpoints';
import request from 'supertest';
import { populateDatabaseWithVCData } from '../../../utils/populate-database-with-vc-data';
import { sendSNSDeleteMessage } from '../../../utils/send-sns-message';

let authorizationToken: string;
let apiKey: string;
let vcsGETResponse: any;
let testUserId: any;
const testVCsToPersistBatch1 = getArrayOfValidVcTokens(2);
let deleteSnsResponse: any;

export const deleteSnsMethod: StepDefinitions = ({ given, when, and, then }) => {
  given(/^I created a valid userId$/, async () => {
    testUserId = generateRandomTestUserId();
  });

  given(/^I obtained an api key$/, async () => {
    apiKey = await getApiKey();
    expect(typeof apiKey).toEqual('string');
    expect(apiKey.trim()).toBeTruthy();
  });

  given(/^I obtained an authorization token$/, async () => {
    authorizationToken = await generateAuthorizationToken(testUserId);
    expect(typeof authorizationToken).toEqual('string');
    expect(authorizationToken.trim()).toBeTruthy();
    console.log('OBTAINED VALID AUTHORIZATION TOKEN' + ' ' + authorizationToken);
  });

  given(/^I prepopulate the database with valid VCs for the userId$/, async () => {
    await timeDelayForTestEnvironment();
    const persistResponse = await populateDatabaseWithVCData(testVCsToPersistBatch1, testUserId);
    expect(typeof persistResponse.messageId).toEqual('string');
    expect(persistResponse.messageId).toBeTruthy();
  });

  when(/^I send a valid GET request to the vcs endpoint$/, async () => {
    await timeDelayForTestEnvironment(3000);
    vcsGETResponse = await request(EndPoints.BASE_URL)
      .get(EndPoints.PATH_VCS + testUserId)
      .set('Accept', '*/*')
      .set('x-api-key', apiKey)
      .set('Authorization', 'Bearer' + ' ' + authorizationToken)
      .set('Content-Type', 'application/json');
    console.log(JSON.stringify(vcsGETResponse, undefined, 2));
  });

  when(/^I send a GET request to the vcs endpoint$/, async () => {
    await timeDelayForTestEnvironment(20_000);
    vcsGETResponse = await request(EndPoints.BASE_URL)
      .get(EndPoints.PATH_VCS + testUserId)
      .set('Accept', '*/*')
      .set('x-api-key', apiKey)
      .set('Authorization', 'Bearer' + ' ' + authorizationToken)
      .set('Content-Type', 'application/json');
    console.log(JSON.stringify(vcsGETResponse, undefined, 2));
  });

  then(/^the returned data should be the same as original data$/, async () => {
    expect(vcsGETResponse.statusCode).toEqual(200);
    expect(vcsGETResponse.body.vcs.sort()).toEqual(testVCsToPersistBatch1.sort());
    console.log(
      'GET Response Status Code = ' +
        vcsGETResponse.statusCode +
        ' GET Response Body VCS = ' +
        JSON.stringify(vcsGETResponse.body, undefined, 2),
    );
  });

  given(/^I send a message for a UserId to the Delete SNS Topic$/, async () => {
    const messageKey = 'user_id';
    deleteSnsResponse = await sendSNSDeleteMessage(messageKey, testUserId);
  });

  and(/^I send an invalid (.*) to the Delete SNS Topic$/, async (messageKey: string) => {
    deleteSnsResponse = await sendSNSDeleteMessage(messageKey, testUserId);
  });

  and(/^I send an empty message to the Delete SNS Topic$/, async () => {
    const messageKey = '';
    const value = '';
    deleteSnsResponse = await sendSNSDeleteMessage(messageKey, value);
  });

  and(/^I receive a metadata with (.*)$/, async (deleteHttpStatusCode) => {
    expect(deleteSnsResponse.$metadata.httpStatusCode).toEqual(Number(deleteHttpStatusCode));
  });

  then(/^I should receive a (.*) with no data found (.*)$/, async (statusCode, response) => {
    await timeDelayForTestEnvironment(3000);
    expect(vcsGETResponse.statusCode).toEqual(Number(statusCode));
    expect(vcsGETResponse.body.message).toStrictEqual(response);
  });

  given(/^I prepopulate the database with 100 VCs for the userId$/, async () => {
    for (let index = 0; index < 4; index++) {
      const testVcsToPersist = getArrayOfValidVcTokens(25);
      const persistResponse = await populateDatabaseWithVCData(testVcsToPersist, testUserId);
      await timeDelayForTestEnvironment();
      expect(typeof persistResponse.messageId).toEqual('string');
      expect(persistResponse.messageId).toBeTruthy();
    }
  });

  given(/^I send an valid message to a non existing UserId to the Delete SNS Topic$/, async () => {
    const messageKey = 'user_id';
    const newUserId = generateRandomTestUserId();
    deleteSnsResponse = await sendSNSDeleteMessage(messageKey, newUserId);
  });
};
