import { getRequest } from "../axios-get-request";

const testUserId = 'urn:fdc:gov.uk:2022:TEST_USER-BB4HZX5Z9j-38nn-f-GXZ7wDPJ2KUGGX4RSw';
describe('Api-Client', () => {
  it('will get the users data from the API', async () => {
    const response = await getRequest(testUserId);
    expect(response).toBe('some placeholder response');
  })
});
