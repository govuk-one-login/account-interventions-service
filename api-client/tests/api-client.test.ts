import path from "path";
import { PactV3 } from '@pact-foundation/pact';
import { apiClient } from '../api-client';
import { accountIsBlocked, accountNotFound, accountHasNoIntervention } from "../api-client-utils";

const client = new apiClient(`http://127.0.0.1:8080/`)
const userId = 'testUserId';

const provider = new PactV3({
  consumer: "AIS TS Client",
  provider: "Account Intervention Service",
  logLevel: "debug",
  dir: path.resolve(process.cwd(), "pacts"),
  port: 8080,
});

describe('AIS Provider PACT Testing', () => {
  it('will accept a GET request and return data for an existing user', async () => {
    provider.addInteraction({
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
      expect(response).toBeTruthy();
      expect(response?.message).toBe('OK');
      expect(response?.status).toBe(200);
      expect(response?.payload).toEqual(accountIsBlocked);
    })
  })

  it('will accept a GET request and return data for a non existing user', async () => {
    provider.addInteraction({
      states: [{description: 'a non existing user account'}],
      uponReceiving: 'a request to get a non existing account information',
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
      expect(response).toBeTruthy();
      expect(response?.message).toBe('OK');
      expect(response?.status).toBe(200);
      expect(response?.payload).toEqual(accountNotFound);
    })
  })

  it('will accept a GET request and return data for a user account with no intervention status', async () => {
    provider.addInteraction({
      states: [{description: 'an existing user with no intervention status'}],
      uponReceiving: 'a request to get an existing users information that has no intervention status',
      withRequest: {
        method: 'GET',
        path: '/ais/testUserId',
      },
      willRespondWith: {
        status: 200,
        body: accountHasNoIntervention
      }
    });
    await provider.executeTest(async () => {
      const response = await client.getRequest(userId);
      expect(response).toBeTruthy();
      expect(response?.message).toBe('OK');
      expect(response?.status).toBe(200);
      expect(response?.payload).toEqual(accountHasNoIntervention);
    })
  })

  it('will return 400 and an invalid request message, if there is no userId', async () => {
    provider.addInteraction({
      states: [{description: 'a request without userId passed in'}],
      uponReceiving: 'a request for account information without a user id',
      withRequest: {
        method: 'GET',
        path: '/ais/',
      },
      willRespondWith: {
        status: 400,
        body: {"message":"Invalid Request."}
      }
    });
    await provider.executeTest(async () => {
      const response = await client.getRequest('');
      expect(response?.message).toBe('Bad Request');
      expect(response?.status).toBe(400);
      expect(response?.payload).toEqual({"message":"Invalid Request."});
    })
  })

  it('will return 500 and an internal server error message', async () => {
    provider.addInteraction({
      states: [{description: 'a request to get a users information from an unhealthy provider'}],
      uponReceiving: 'a request to get a users information, but the provider is not healthy',
      withRequest: {
        method: 'GET',
        path: '/ais/testUserId',
      },
      willRespondWith: {
        status: 500,
        body: {"message":"Invalid Request."}
      }
    });
    await provider.executeTest(async () => {
      const response = await client.getRequest(userId);
      expect(response?.message).toBe('Internal Server Error');
      expect(response?.status).toBe(500);
      expect(response?.payload).toEqual({"message":"Internal Server Error."});
    })
  })

  it('will return 502 and a Bad Gateway message', async () => {
    provider.addInteraction({
      states: [{description: 'when a 502 status code is returned from a GET request'}],
      uponReceiving: 'a request to get a users information, but recieved an invalid response from an upstream server',
      withRequest: {
        method: 'GET',
        path: '/ais/testUserId',
      },
      willRespondWith: {
        status: 502,
        body: {"message":"Bad Gateway."}
      }
    });
    await provider.executeTest(async () => {
      const response = await client.getRequest(userId);
      expect(response?.message).toBe('Bad Gateway');
      expect(response?.status).toBe(502);
      expect(response?.payload).toEqual({"message":"Bad Gateway."});
    })
  })

  it('will return 504 and a gateway timeout message', async () => {
    provider.addInteraction({
      states: [{description: 'when a 504 status code is returned from a GET request'}],
      uponReceiving: 'a request to get a users information, but the response timed out from the upstream server',
      withRequest: {
        method: 'GET',
        path: '/ais/testUserId',
      },
      willRespondWith: {
        status: 504,
        body: {"message":"Gateway Timeout."}
      }
    });
    await provider.executeTest(async () => {
      const response = await client.getRequest(userId);
      expect(response?.message).toBe('Gateway Timeout');
      expect(response?.status).toBe(504);
      expect(response?.payload).toEqual({"message":"Gateway Timeout."});
    })
  })

  it('will return an unexpected error message', async () => {
    provider.addInteraction({
      states: [{description: 'when a status code that is not expected is returned from a GET request'}],
      uponReceiving: 'a request to get a users information, but the status code provided does not match the expected responses',
      withRequest: {
        method: 'GET',
        path: '/ais/testUserId',
      },
      willRespondWith: {
        status: 404,
        body: {"message":"Unexpected Error."}
      }
    });
    await provider.executeTest(async () => {
      const response = await client.getRequest(userId);
      expect(response?.message).toBe('Not Found');
      expect(response?.status).toBe(404);
      expect(response?.payload).toEqual({"message":"Unexpected Error."});
    })
  })
})
