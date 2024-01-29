import { apiClient } from '../axios-config';
// import axios from 'axios';

// const spy = jest.spyOn(axios, 'get')
// jest.spyOn(axios, 'create');
// spy.mockImplementation(async (url) => {
//   return url
// })

jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    get: jest.fn().mockImplementation(() => {
      return 'string'
    }),
  }),
}))

const client = new apiClient();
const testUserId = 'urn:fdc:gov.uk:2022:TEST_USER-BB4HZX5Z9j-38nn-f-GXZ7wDPJ2KUGGX4RSw';

describe('Api-Client', () => {
  it('will get the users data from the API', async () => {

    const response = await client.getRequest(testUserId);
    expect(response).toBe('string');
  })
});
