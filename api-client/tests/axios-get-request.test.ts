import path from "path";
import { MatchersV3, PactV3 } from '@pact-foundation/pact';
import { apiClient } from '../axios-config';

const provider = new PactV3({
  consumer: "AIS TS Client",
  provider: "ais",
  logLevel: "debug",
  dir: path.resolve(process.cwd(), "pacts"),
  port: 8080,
});

const exampleRecord = {
  intervention: {
    updatedAt: 123455,
    appliedAt: 12345685809,
    sentAt: 123456789,
    description: 'AIS_ACCOUNT_SUSPENDED',
    reprovedIdentityAt: 849473,
    resetPasswordAt: 5847392,
  },
  state: {
    blocked: false,
    suspended: true,
    resetPassword: false,
    reproveIdentity: false,
  },
  auditLevel: 'standard',
};

const expectedBody = MatchersV3.eachLike(exampleRecord);

jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    get: jest.fn().mockImplementation(() => {
      return exampleRecord
    }),
    put: jest.fn().mockImplementation(() => {
      return {userId: 'user', data: 'data'}
    })
  }),
}))

const client = new apiClient();
const testUserId = 'testUserId';

describe('Api-Client', () => {
  it('will get the users data from the API', async () => {
    const response = await client.getRequest(testUserId);
    expect(response).toBe(exampleRecord);
  });

  it('will update the users information', async () => {
    const response = await client.putRequest(testUserId, {data: 'data'});
    expect(response).toEqual({userId: 'user', data: 'data'});
  });

  it('will accept a get request', async () => {
    provider.addInteraction({
      states: [{description: 'a user has a record in the database'}],
      uponReceiving: 'a request to get the users data',
      withRequest: {
        method: 'GET',
        path: '/ais/testUserId',
        headers: {
          "Content-Type": "application/json"
        },
      },
      willRespondWith: {
        status: 200,
        body: expectedBody
      },
    })
    await provider.executeTest(async () => {
      const response = await client.getRequest(testUserId);
      expect(response).toBeTruthy();
  //  const output = Object.keys(response ?? {});
  // figure out .next(), might only work with arrays? 
  //  const iterate = output.next();
  //  expect(iterate.done).toEqual(true);
  //  expect(iterate.value).toEqual({"responseMetadata":{"statusCode":200,"message":"OK"},"payload": expectedBody });
    })
  }) 
});