import EndPoints from '../apiEndpoints/endpoints';
import { generateAuthorizationToken } from './generate-authorization-token';
import { getArrayOfValidVcTokens, getVcTokensbasedOnVcType } from './generate-valid-vc-tokens';
import { generateRandomTestUserId } from './generate-random-test-user-id';
import { getApiKey } from './get-api-key';
import { DEFAULT_SIGNATURE_TYPE, DEFAULT_TOKEN_TYPE } from './constants';
import { timeDelayForTestEnvironment } from './utility';

/**
 * Function to send a post call to the /vcs endpoint to persist data against a userID
 * If no user id is provided, a random one is generated automatically
 * If no vcs are provided, a default payload is generated of 5 vcs
 * @param vcs - VCs to be stored
 * @param userId - userId against which VCs shall be stored
 */
export async function populateDatabaseWithVCData(
  vcs: string[] = getArrayOfValidVcTokens(1),
  userId: string = generateRandomTestUserId(),
) {
  console.log(`Initiating set up: populating database with data for userId ${userId}, saving ${vcs.length} VCs`);
  const token = await generateAuthorizationToken(userId, DEFAULT_TOKEN_TYPE, DEFAULT_SIGNATURE_TYPE);
  const apiKey = await getApiKey();
  await timeDelayForTestEnvironment(3500);
  // eslint-disable-next-line unicorn/no-await-expression-member
  const response = await fetch(EndPoints.BASE_URL + EndPoints.PATH_VCS + userId, {
    method: 'POST',
    body: JSON.stringify(vcs),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer' + ' ' + token,
      'x-api-key': apiKey,
    },
  });
  expect(response.status).toEqual(202);
  if (response.ok) console.log('set up step SUCCEEDED: database populated with data for userID: ' + userId);
  else console.log('set up step FAILED: database did not populate with data');
  return await response.json();
}

export async function populateDatabaseWithSpecificVCData(
  vcs: string[] = getVcTokensbasedOnVcType('addressVCS'),
  userId: string = generateRandomTestUserId(),
) {
  console.log(`Initiating set up: populating database with data for userId ${userId}, saving ${vcs.length} VCs`);
  const token = await generateAuthorizationToken(userId, DEFAULT_TOKEN_TYPE, DEFAULT_SIGNATURE_TYPE);
  const apiKey = await getApiKey();
  await timeDelayForTestEnvironment(3000);
  // eslint-disable-next-line unicorn/no-await-expression-member
  const response = await fetch(EndPoints.BASE_URL + EndPoints.PATH_VCS + userId, {
    method: 'POST',
    body: JSON.stringify(vcs),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer' + ' ' + token,
      'x-api-key': apiKey,
    },
  });
  expect(response.status).toEqual(202);
  if (response.ok) console.log('set up step SUCCEEDED: database populated with data for userID: ' + userId);
  else console.log('set up step FAILED: database did not populate with data');
  return await response.json();
}
