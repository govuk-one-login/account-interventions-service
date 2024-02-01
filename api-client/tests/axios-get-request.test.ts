import path from "path";
import { apiClient } from '../axios-config';
import { PactV3 } from '@pact-foundation/pact';

// const provider = new PactV3({
//   consumer: "AIS TS Client",
//   provider: "AIS",
//   logLevel: "debug",
//   dir: path.resolve(process.cwd(), "pacts"),
//   port: 8080,
//});

jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    get: jest.fn().mockImplementation(() => {
      return 'string'
    }),
    put: jest.fn().mockImplementation(() => {
      return {userId: 'user', data: 'data'}
    })
  }),
}))

const client = new apiClient();
const testUserId = 'urn:fdc:gov.uk:2022:TEST_USER-BB4HZX5Z9j-38nn-f-GXZ7wDPJ2KUGGX4RSw';

describe('Api-Client', () => {
  it('will get the users data from the API', async () => {
    const response = await client.getRequest(testUserId);
    expect(response).toBe('string');
  });

});