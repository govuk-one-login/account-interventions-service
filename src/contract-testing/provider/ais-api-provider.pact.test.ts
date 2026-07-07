import { mockClient } from 'aws-sdk-client-mock';
import { InternalServerError } from '@aws-sdk/client-dynamodb';
import { closeServer, setupServer } from '../test-helpers/mock-server';
import { Verifier, VerifierOptions } from '@pact-foundation/pact';
import { AISInterventionTypes } from '../../data-types/constants';
import { StateDetails } from '../../data-types/interfaces';
import getEnvironmentOrThrow from '../../commons/get-environment-or-throw';
import { DynamoDBDocumentClient, NativeAttributeValue, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { InterventionName } from '../../data-types/intervention-name';
import { InterventionState } from '../../data-types/constants';

vi.mock('@aws-lambda-powertools/metrics');
vi.mock('@aws-lambda-powertools/logger');
const port = 8080;
const databaseDocumentMock = mockClient(DynamoDBDocumentClient);
const queryCommandMock = databaseDocumentMock.on(QueryCommand);
const server = setupServer(port);
function getDynamoDBResponseObject(
  interventionName: AISInterventionTypes,
  state: StateDetails,
): Record<string, NativeAttributeValue> {
  return {
    pk: '1234',
    blocked: state.blocked,
    suspended: state.suspended,
    reproveIdentity: state.reproveIdentity,
    resetPassword: state.resetPassword,
    sentAt: 123456,
    appliedAt: 123456,
    isAccountDeleted: false,
    intervention: interventionName,
    updatedAt: 123456,
    history: [],
  };
}

/* eslint-disable @typescript-eslint/require-await */
const config: VerifierOptions = {
  providerBaseUrl: getEnvironmentOrThrow('PROVIDER_BASE_URL') + getEnvironmentOrThrow('PROVIDER_PORT'),
  providerBranch: getEnvironmentOrThrow('GIT_BRANCH'),
  providerVersion: getEnvironmentOrThrow('PROVIDER_APP_VERSION'),
  pactBrokerUrl: getEnvironmentOrThrow('PACT_BROKER_URL'),
  publishVerificationResult: getEnvironmentOrThrow('PUBLISH_RESULT') === 'true',
  consumerVersionTags: ['main'],
  pactBrokerPassword: getEnvironmentOrThrow('PACT_BROKER_PASSWORD'),
  pactBrokerUsername: getEnvironmentOrThrow('PACT_BROKER_USER'),
  provider: 'AccountInterventionServiceProvider',
  logLevel: 'error',
  stateHandlers: {
    'provider is healthy': async () => {
      queryCommandMock.resolves({ Items: [] });
    },
    'provider is not healthy': async () => {
      const error = new InternalServerError({ message: 'Internal Server Error.', $metadata: { httpStatusCode: 500 } });
      queryCommandMock.rejects(error);
    },
    'AIS encounters an error and responds with 500 status': async () => {
      const error = new InternalServerError({ message: 'Internal Server Error.', $metadata: { httpStatusCode: 500 } });
      queryCommandMock.rejects(error);
    },
    //suspended
    'internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = true, reproveIdentity = false, resetPassword = false':
      async () => {
        queryCommandMock.resolves({
          Items: [
            getDynamoDBResponseObject(AISInterventionTypes.AIS_ACCOUNT_SUSPENDED, {
              blocked: false,
              suspended: true,
              reproveIdentity: false,
              resetPassword: false,
            }),
          ],
        });
      },
    //no intervention
    'internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = false, reproveIdentity = false, resetPassword = false':
      async () => {
        queryCommandMock.resolves({
          Items: [
            getDynamoDBResponseObject(AISInterventionTypes.AIS_NO_INTERVENTION, {
              blocked: false,
              suspended: false,
              reproveIdentity: false,
              resetPassword: false,
            }),
          ],
        });
      },
    //password reset
    'internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = true, reproveIdentity = false, resetPassword = true':
      async () => {
        queryCommandMock.resolves({
          Items: [
            getDynamoDBResponseObject(AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET, {
              blocked: false,
              suspended: true,
              reproveIdentity: false,
              resetPassword: true,
            }),
          ],
        });
      },
    //id reset
    'internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = true, reproveIdentity = true, resetPassword = false':
      async () => {
        queryCommandMock.resolves({
          Items: [
            getDynamoDBResponseObject(AISInterventionTypes.AIS_FORCED_USER_IDENTITY_VERIFY, {
              blocked: false,
              suspended: true,
              reproveIdentity: true,
              resetPassword: false,
            }),
          ],
        });
      },
    //id and password reset
    'internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = true, reproveIdentity = true, resetPassword = true':
      async () => {
        queryCommandMock.resolves({
          Items: [
            getDynamoDBResponseObject(AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY, {
              blocked: false,
              suspended: true,
              reproveIdentity: true,
              resetPassword: true,
            }),
          ],
        });
      },
    //blocked
    'internal pairwise subject id corresponds to an account that has state: blocked = true, suspended = false, reproveIdentity = false, resetPassword = false':
      async () => {
        queryCommandMock.resolves({
          Items: [
            getDynamoDBResponseObject(AISInterventionTypes.AIS_ACCOUNT_BLOCKED, {
              blocked: true,
              suspended: false,
              reproveIdentity: false,
              resetPassword: false,
            }),
          ],
        });
      },
    //non-existing
    'the internal pairwise subject id does not exist in the AIS database': async () => {
      queryCommandMock.resolves({ Items: [] });
    },

    // --- v2 Status API State Handlers ---

    // v2: no account found
    'v2 the internal pairwise subject id does not exist in the AIS database': async () => {
      queryCommandMock.resolves({ Items: [] });
    },
    // v2: suspended
    'v2 internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = true, reproveIdentity = false, resetPassword = false':
      async () => {
        queryCommandMock
          .resolvesOnce({
            Items: [
              getDynamoDBResponseObject(AISInterventionTypes.AIS_ACCOUNT_SUSPENDED, {
                blocked: false,
                suspended: true,
                reproveIdentity: false,
                resetPassword: false,
              }),
            ],
          })
          .resolvesOnce({
            Items: [
              {
                eventId: 'event-1',
                accountId: '1234',
                createdAt: 123456,
                interventionName: InterventionName.TEMPORARY_SUSPENSION,
                interventionState: InterventionState.ACTIVE,
                interventionReason: 'reason',
                sentAt: 123456,
                componentId: 'test',
              },
            ],
          });
      },
    // v2: no intervention
    'v2 internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = false, reproveIdentity = false, resetPassword = false':
      async () => {
        queryCommandMock
          .resolvesOnce({
            Items: [
              getDynamoDBResponseObject(AISInterventionTypes.AIS_NO_INTERVENTION, {
                blocked: false,
                suspended: false,
                reproveIdentity: false,
                resetPassword: false,
              }),
            ],
          })
          .resolvesOnce({
            Items: [],
          });
      },
    // v2: blocked
    'v2 internal pairwise subject id corresponds to an account that has state: blocked = true, suspended = false, reproveIdentity = false, resetPassword = false':
      async () => {
        queryCommandMock
          .resolvesOnce({
            Items: [
              getDynamoDBResponseObject(AISInterventionTypes.AIS_ACCOUNT_BLOCKED, {
                blocked: true,
                suspended: false,
                reproveIdentity: false,
                resetPassword: false,
              }),
            ],
          })
          .resolvesOnce({
            Items: [
              {
                eventId: 'event-1',
                accountId: '1234',
                createdAt: 123456,
                interventionName: InterventionName.PERMANENT_SUSPENSION,
                interventionState: InterventionState.ACTIVE,
                interventionReason: 'reason',
                sentAt: 123456,
                componentId: 'test',
              },
            ],
          });
      },
    // v2: password reset
    'v2 internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = true, reproveIdentity = false, resetPassword = true':
      async () => {
        queryCommandMock
          .resolvesOnce({
            Items: [
              getDynamoDBResponseObject(AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET, {
                blocked: false,
                suspended: true,
                reproveIdentity: false,
                resetPassword: true,
              }),
            ],
          })
          .resolvesOnce({
            Items: [
              {
                eventId: 'event-1',
                accountId: '1234',
                createdAt: 123456,
                interventionName: InterventionName.RESET_PASSWORD,
                interventionState: InterventionState.ACTIVE,
                interventionReason: 'reason',
                sentAt: 123456,
                componentId: 'test',
              },
            ],
          });
      },
    // v2: id reset
    'v2 internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = true, reproveIdentity = true, resetPassword = false':
      async () => {
        queryCommandMock
          .resolvesOnce({
            Items: [
              getDynamoDBResponseObject(AISInterventionTypes.AIS_FORCED_USER_IDENTITY_VERIFY, {
                blocked: false,
                suspended: true,
                reproveIdentity: true,
                resetPassword: false,
              }),
            ],
          })
          .resolvesOnce({
            Items: [
              {
                eventId: 'event-1',
                accountId: '1234',
                createdAt: 123456,
                interventionName: InterventionName.REPROVE_IDENTITY,
                interventionState: InterventionState.ACTIVE,
                interventionReason: 'reason',
                sentAt: 123456,
                componentId: 'test',
              },
            ],
          });
      },
    // v2: id and password reset
    'v2 internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = true, reproveIdentity = true, resetPassword = true':
      async () => {
        queryCommandMock
          .resolvesOnce({
            Items: [
              getDynamoDBResponseObject(AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY, {
                blocked: false,
                suspended: true,
                reproveIdentity: true,
                resetPassword: true,
              }),
            ],
          })
          .resolvesOnce({
            Items: [
              {
                eventId: 'event-1',
                accountId: '1234',
                createdAt: 123456,
                interventionName: InterventionName.RESET_PASSWORD,
                interventionState: InterventionState.ACTIVE,
                interventionReason: 'reason',
                sentAt: 123456,
                componentId: 'test',
              },
              {
                eventId: 'event-2',
                accountId: '1234',
                createdAt: 123457,
                interventionName: InterventionName.REPROVE_IDENTITY,
                interventionState: InterventionState.ACTIVE,
                interventionReason: 'reason',
                sentAt: 123456,
                componentId: 'test',
              },
            ],
          });
      },
    // v2: error
    'v2 AIS encounters an error and responds with 500 status': async () => {
      const error = new InternalServerError({ message: 'Internal Server Error.', $metadata: { httpStatusCode: 500 } });
      queryCommandMock.rejects(error);
    },
  },
};
/* eslint-enable @typescript-eslint/require-await */

describe('PACT verification', () => {
  afterAll(() => {
    closeServer(server);
  });
  it('will verify the json file', async () => {
    const verify = new Verifier(config);
    await verify.verifyProvider();
  });
});
