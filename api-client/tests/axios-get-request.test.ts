import path from "path";
import { PactV3 } from '@pact-foundation/pact';
import { apiClient } from '../axios-client';

const client = new apiClient(`http://127.0.0.1:8080/`)
const userId = 'testUserId';
const accountIsBlocked = {
  intervention: {
    updatedAt: 123455,
    appliedAt: 12345685809,
    sentAt: 123456789,
    description: 'AIS_ACCOUNT_BLOCKED',
    reprovedIdentityAt: 849473,
    resetPasswordAt: 5847392,
    accountDeletedAt: 12345685809,
  },
  state: {
    blocked: true,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
  },
  auditLevel: 'standard',
};

const provider = new PactV3({
  consumer: "AIS TS Client",
  provider: "Account Intervention Service",
  logLevel: "debug",
  dir: path.resolve(process.cwd(), "pacts"),
  port: 8080,
});
// const expectedBody = MatchersV3.eachLike(exampleRecord);

describe('', () => {
  it('will accept a GET request and return data for an existing user', async () => {
    await provider.addInteraction({
      states: [{description: 'a user account is in a blocked state'}],
      uponReceiving: 'a request to get the users account information',
      withRequest: {
        method: 'GET',
        path: '/ais/testUserId',
      },
      willRespondWith: {
        status: 200,
        body: accountIsBlocked
      }
    });
    await provider.executeTest(async () => {
      const response = await client.getRequest(userId);
      console.log(response);
      expect(response).toBeTruthy();
      expect(response?.message).toBe('OK');
      expect(response?.status).toBe(200);
      expect(response?.payload).toEqual(accountIsBlocked);
    })
  })
})

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
