/* eslint unicorn/no-null: 0 */
import request from 'supertest';
import EndPoints from '../../../apiEndpoints/endpoints';
import type { StepDefinitions } from 'jest-cucumber';
import { populateDatabaseWithVCData } from '../../../utils/populate-database-with-vc-data';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import { generateRandomTestUserId, urlEncodeUserID } from '../../../utils/generate-random-test-user-id';
import { getArrayOfValidVcTokens } from '../../../utils/generate-valid-vc-tokens';
import { generateAuthorizationToken } from '../../../utils/generate-authorization-token';
import { getApiKey } from '../../../utils/get-api-key';
import { JSONArray } from '@aws-lambda-powertools/commons';

let authorizationToken: string;
let apiKey: string;
let getVCsResponse: any;
let testUserId: any;
const testVCsToPersistBatch1 = getArrayOfValidVcTokens(2);
const testVCsToPersist = getArrayOfValidVcTokens(25);
let afterKey: string;
let firstSetOfVcs: JSONArray;
//const promise: request.Response[] = [];

export const getVCsForUserId: StepDefinitions = ({ given, when, then, and }) => {
  given('I created a valid new valid userId', async () => {
    testUserId = generateRandomTestUserId();
  });

  given('I prepopulate the database with valid VCs for userId', async () => {
    const persistResponse = await populateDatabaseWithVCData(testVCsToPersistBatch1, testUserId);
    expect(typeof persistResponse.messageId).toEqual('string');
    expect(persistResponse.messageId).toBeTruthy();
  });

  given('I prepopulate the userId database with valid VCs', async () => {
    const testVCsToPersist = getArrayOfValidVcTokens(15);
    const persistResponse = await populateDatabaseWithVCData(testVCsToPersist, testUserId);
    expect(typeof persistResponse.messageId).toEqual('string');
    expect(persistResponse.messageId).toBeTruthy();
  });

  and('I prepolulate the database with max limit of valid VCs for the same userId', async () => {
    const persistResponse = await populateDatabaseWithVCData(testVCsToPersist, testUserId);
    expect(typeof persistResponse.messageId).toEqual('string');
    expect(persistResponse.messageId).toBeTruthy();
  });

  given('I have obtained a valid api key', async () => {
    apiKey = await getApiKey();
    expect(typeof apiKey).toEqual('string');
    expect(apiKey.trim()).toBeTruthy();
  });

  given(/^I have obtained an authorization token with (.*)$/, async function (signatureType: string) {
    authorizationToken = await generateAuthorizationToken(testUserId, undefined, signatureType, 120);
    expect(typeof authorizationToken).toEqual('string');
    expect(authorizationToken.trim()).toBeTruthy();
    console.log('OBTAINED VALID AUTHORIZATION TOKEN' + ' ' + authorizationToken);
  });

  given(
    /^I have send a request to obtain a valid authorization token with (.*) and (.*)$/,
    async function (ttl: number, iat: number) {
      authorizationToken = await generateAuthorizationToken(
        testUserId,
        undefined,
        undefined,
        ttl,
        undefined,
        undefined,
        iat,
      );
      expect(typeof authorizationToken).toEqual('string');
      expect(authorizationToken.trim()).toBeTruthy();
      console.log('OBTAINED VALID AUTHORIZATION TOKEN' + ' ' + authorizationToken);
    },
  );

  given('There is no data stored for the given userId', async () => {
    // here we could/should send a request to delete the data for the test user id
    //way around it is to override the testUserId with a new one for which we have not persisted any data
    //and generate a new token in line with change of user id
    authorizationToken = await generateAuthorizationToken(testUserId);
    expect(typeof authorizationToken).toEqual('string');
    expect(authorizationToken.trim()).toBeTruthy();
  });

  when(
    /^I send a GET request with (.*) and (.*) to the GET vcs endpoint$/,
    async (contentType: string, accept: string) => {
      await timeDelayForTestEnvironment(4000);
      getVCsResponse = await request(EndPoints.BASE_URL)
        .get(EndPoints.PATH_VCS + testUserId)
        .set('x-api-key', apiKey)
        .set('Authorization', 'Bearer' + ' ' + authorizationToken)
        .set('Content-Type', contentType)
        .set('Accept', accept);
      console.log('GET Response Body = ' + JSON.stringify(getVCsResponse, undefined, 2));
    },
  );

  and(/^I send the after key value as a query parameter in the GET vcs endpoint$/, async () => {
    await timeDelayForTestEnvironment();
    getVCsResponse = await request(EndPoints.BASE_URL)
      .get(EndPoints.PATH_VCS + testUserId)
      .query({ afterKey: afterKey })
      .set('x-api-key', apiKey)
      .set('Authorization', 'Bearer' + ' ' + authorizationToken)
      .set('Content-Type', 'application/json')
      .set('Accept', '*/*');
    console.log('GET Responses Body = ' + JSON.stringify(getVCsResponse, undefined, 2));
  });

  when(
    /^I send a request with (.*), (.*) to the GET vcs endpoint with a URL encoded userId$/,
    async (contentType: string, accept: string) => {
      await timeDelayForTestEnvironment();
      getVCsResponse = await request(EndPoints.BASE_URL)
        .get(EndPoints.PATH_VCS + urlEncodeUserID(testUserId))
        .set('x-api-key', apiKey)
        .set('Authorization', 'Bearer' + ' ' + authorizationToken)
        .set('Content-Type', contentType)
        .set('Accept', accept);
      console.log('GET Response Body = ' + JSON.stringify(getVCsResponse, undefined, 2));
    },
  );

  when(
    /^I send a request with mixed case (.*) and (.*) to the GET endpoint$/,
    async (authorizationHeaderKey, xapikeyHeaderKey) => {
      await timeDelayForTestEnvironment();
      getVCsResponse = await request(EndPoints.BASE_URL)
        .get(EndPoints.PATH_VCS + testUserId)
        .set(xapikeyHeaderKey, apiKey)
        .set(authorizationHeaderKey, 'Bearer' + ' ' + authorizationToken)
        .set('Content-Type', 'application/json')
        .set('Accept', '*/*');
      console.log('GET Response Body = ' + JSON.stringify(getVCsResponse, undefined, 2));
      await timeDelayForTestEnvironment();
    },
  );

  then(
    /^I should receive the appropriate (.*) for the request to get the userId VC data from the VCS endpoint$/,
    async (statusCode: string) => {
      expect(getVCsResponse.statusCode).toBe(Number(statusCode));
      expect(getVCsResponse.body.vcs.sort()).toEqual(testVCsToPersistBatch1.sort());
      console.log(
        'GET Response Status Code = ' +
          getVCsResponse.statusCode +
          ' GET Response Body VCS = ' +
          JSON.stringify(getVCsResponse.body, undefined, 2),
      );
    },
  );

  then(/^I should receive a (.*) response for the request$/, async (statusCode: string) => {
    expect(getVCsResponse.statusCode).toBe(Number(statusCode));
    console.log(
      'GET Response Status Code = ' +
        getVCsResponse.statusCode +
        ' GET Response Body VCS = ' +
        JSON.stringify(getVCsResponse.body, undefined, 2),
    );
  });

  given(/^I send a invalid GET request to the VCS endpoint using an invalid endpoint$/, async () => {
    await timeDelayForTestEnvironment();
    getVCsResponse = await request(EndPoints.BASE_URL)
      .get(EndPoints.INVALID_PATH_VCS + testUserId)
      .set('Accept', 'application/json')
      .set('x-api-key', await getApiKey())
      .set('Authorization', 'Bearer' + ' ' + authorizationToken)
      .set('Content-Type', 'application/json')
      .set('Accept', '*/*');
    console.log('GET Response Body = ' + JSON.stringify(getVCsResponse, undefined, 2));
  });

  then(/^I should receive a response with (.*) and (.*)$/, async (statusCode: string, responseMessage: string) => {
    expect(getVCsResponse.statusCode).toBe(Number(statusCode));
    expect(getVCsResponse.body.message).toContain(responseMessage);
    console.log(
      'GET Response Status Code = ' +
        getVCsResponse.statusCode +
        ' GET Response Body VCS = ' +
        JSON.stringify(getVCsResponse.body, undefined, 2),
    );
  });

  and(/^I receive the (.*) and after key value in the GET response$/, async (statusCode) => {
    expect(getVCsResponse.statusCode).toBe(Number(statusCode));
    firstSetOfVcs = getVCsResponse.body.vcs as JSONArray;
    afterKey = getVCsResponse.body.afterKey;
    console.log(
      'GET Response Status Code = ' +
        getVCsResponse.statusCode +
        ' GET Response Body VCS = ' +
        JSON.stringify(getVCsResponse.body.vcs, undefined, 2),
    );
  });

  // given(
  //   /^I send a multiple requests with valid authorization token and valid apikey to get vcs endpoint$/,
  //   async function () {
  //     await timeDelayForTestEnvironment(3000);
  //     for (let index = 0; index <= 30; index++) {
  //       const vcsGETResponse = request(EndPoints.BASE_URL)
  //         .get(EndPoints.PATH_VCS + testUserId)
  //         .set('Accept', '*/*')
  //         .set('x-api-key', await getApiKey())
  //         .set('Authorization', 'Bearer' + ' ' + authorizationToken)
  //         .set('Content-Type', 'application/json');
  //       promise.push(await vcsGETResponse);
  //     }
  //     await Promise.allSettled(promise);
  //   },
  // );

  then(/^I receive the (.*) and validate vcs retreive is unique in the GET vcs response$/, async (statusCode) => {
    expect(getVCsResponse.statusCode).toBe(Number(statusCode));
    const afterKeyVcs = getVCsResponse.body.vcs as JSONArray;
    const resultedVCsArray = firstSetOfVcs.filter((item) => afterKeyVcs.includes(item));
    expect(resultedVCsArray).toHaveLength(0);
    console.log(
      'GET Response Status Code = ' +
        getVCsResponse.statusCode +
        'GET Response Body VCS = ' +
        JSON.stringify(getVCsResponse.body, undefined, 2),
    );
  });

  // then(/^I should receive the (.*) and (.*) in the GET vcs response$/, async (statusCode, responseMessage) => {
  //   const found = promise.findIndex((element: request.Response) => element.statusCode === Number.parseInt(statusCode));
  //   expect(found).toBeGreaterThan(-1);
  //   expect(promise[found].status).toEqual(Number.parseInt(statusCode));
  //   expect(promise[found].text).toEqual(JSON.stringify({ message: responseMessage }));
  // });
};
