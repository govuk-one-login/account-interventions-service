// import path from "path";
// import { PactV3 } from '@pact-foundation/pact';
import { apiClient } from '../axios-config';
import { host, port } from '../axios-utils';

// const provider = new PactV3({
//   consumer: "AIS TS Client",
//   provider: "ais",
//   logLevel: "debug",
//   dir: path.resolve(process.cwd(), "pacts"),
//   port: 8080,
// });
// const expectedBody = MatchersV3.eachLike(exampleRecord);

const url = `http://${host}:${port}/`
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

const client = new apiClient(url); //might be able to pass in mockserver.url here.
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

  // it('will accept a get request', async () => {
  //   provider.addInteraction({
  //     states: [{description: 'a user has a record in the database'}],
  //     uponReceiving: 'a request to get the users data',
  //     withRequest: {
  //       method: 'GET',
  //       path: '/ais/testUserId',
  //       headers: {
  //         "Content-Type": "application/json"
  //       },
  //     },
  //     willRespondWith: {
  //       status: 200,
  //       body: exampleRecord,
  //     },
  //   })
  //   await provider.executeTest(async () => {
  //     const response = await client.getRequest(testUserId) as any;
  //     expect(response).toBeTruthy();
  //     for (let key in response) {
  //       expect(response[key].auditLevel).toEqual(undefined);
  //       expect(response.body).toEqual({"responseMetadata":{"statusCode":200,"message":"OK"},"payload": exampleRecord });
  //     }
  //   })
  // }) 
});