import path from "path";
import { PactV3 } from '@pact-foundation/pact';
import { apiClient } from '../axios-client';
import { accountIsBlocked, accountNotFound } from "../axios-utils";

//non existing user
//no active intervention but user account exists

const client = new apiClient(`http://127.0.0.1:8080/`)
const userId = 'testUserId';

const provider = new PactV3({
  consumer: "AIS TS Client",
  provider: "Account Intervention Service",
  logLevel: "debug",
  dir: path.resolve(process.cwd(), "pacts"),
  port: 8080,
});

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

  it('will accept a GET request and return data for a non existing user', async () => {
    await provider.addInteraction({
      states: [{description: 'a non existing user account'}],
      uponReceiving: 'a request to get the users account information',
      withRequest: {
        method: 'GET',
        path: '/ais/testUserId',
      },
      willRespondWith: {
        status: 200,
        body: accountNotFound
      }
    });
    await provider.executeTest(async () => {
      const response = await client.getRequest(userId);
      console.log(response);
      expect(response).toBeTruthy();
      expect(response?.message).toBe('OK');
      expect(response?.status).toBe(200);
      expect(response?.payload).toEqual(accountNotFound);
    })
  })
})

