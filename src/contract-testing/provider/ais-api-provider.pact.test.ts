import {mockClient} from "aws-sdk-client-mock";
import {AttributeValue, DynamoDBClient, InternalServerError, QueryCommand} from "@aws-sdk/client-dynamodb";
import {closeServer, setupServer} from "../test-helpers/mock-server";
import {Verifier, VerifierOptions} from "@pact-foundation/pact";
import {AISInterventionTypes} from "../../data-types/constants";
import {StateDetails} from "../../data-types/interfaces";


jest.mock('@aws-lambda-powertools/metrics');
jest.mock('@aws-lambda-powertools/logger');
const port = 8080;
const ddbMock = mockClient(DynamoDBClient);
const queryCommandMock = ddbMock.on(QueryCommand);
setupServer(port)
function getDynamoDBResponseObject (interventionName: AISInterventionTypes, state: StateDetails) : Record<string, AttributeValue> {
  return {
    blocked: {
      BOOL: state.blocked,
    },
    suspended: {
      BOOL: state.suspended,
    },
    reproveIdentity: {
      BOOL: state.reproveIdentity,
    },
    resetPassword: {
      BOOL: state.resetPassword,
    },
    sentAt: {
      N: '123456'
    },
    appliedAt: {
      N: '123456'
    },
    isAccountDeleted: {
      BOOL: false
    },
    intervention: {
      S: interventionName
    },
    updatedAt: {
      N: '123456'
    }
  }
}

console.log(process.env['PACT_BROKER_URL'])

const config: VerifierOptions = {
  providerBaseUrl: process.env['PROVIDER_BASE_URL']! + process.env['PROVIDER_PORT']!,
  providerBranch: process.env['GIT_BRANCH']!,
  providerVersion: process.env['PROVIDER_APP_VERSION']!,
  pactBrokerUrl: "https://pactbroker-onelogin.account.gov.uk/",
  publishVerificationResult: process.env['PUBLISH_RESULT']! === 'true',
  consumerVersionTags: ["ATO-627/update-ais-contract-tests"],
  pactBrokerPassword: process.env['PACT_BROKER_PASSWORD']!,
  pactBrokerUsername: process.env['PACT_BROKER_USER']!,
  provider: 'AccountInterventionServiceProvider',
  logLevel: 'info',
  stateHandlers: {
    'provider is healthy': async () => {
      queryCommandMock.resolves({ Items: [] });
    },
    'provider is not healthy': async () => {
      const error = new InternalServerError({ message: 'Internal Server Error.', $metadata: { httpStatusCode: 500 }})
      queryCommandMock.rejects(error);
    },
    'AIS encounters an error and responds with 500 status': async () => {
      const error = new InternalServerError({ message: 'Internal Server Error.', $metadata: { httpStatusCode: 500 }})
      queryCommandMock.rejects(error);
    },
    //suspended
    'internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = true, reproveIdentity = false, resetPassword = false' : async () => {
      queryCommandMock.resolves({ Items: [ getDynamoDBResponseObject(AISInterventionTypes.AIS_ACCOUNT_SUSPENDED, { blocked: false, suspended: true, reproveIdentity: false, resetPassword: false }) ] });
    },
    //no intervention
    'internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = false, reproveIdentity = false, resetPassword = false': async() => {
      queryCommandMock.resolves({ Items: [ getDynamoDBResponseObject(AISInterventionTypes.AIS_NO_INTERVENTION, { blocked: false, suspended: false, reproveIdentity: false, resetPassword: false }) ] });
    },
    //password reset
    'internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = true, reproveIdentity = false, resetPassword = true': async() => {
      queryCommandMock.resolves({ Items: [ getDynamoDBResponseObject(AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET, { blocked: false, suspended: true, reproveIdentity: false, resetPassword: true }) ] });
    },
    //id reset
    'internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = true, reproveIdentity = true, resetPassword = false': async() => {
      queryCommandMock.resolves({ Items: [ getDynamoDBResponseObject(AISInterventionTypes.AIS_FORCED_USER_IDENTITY_VERIFY, { blocked: false, suspended: true, reproveIdentity: true, resetPassword: false }) ] });
    },
    //id and password reset
    'internal pairwise subject id corresponds to an account that has state: blocked = false, suspended = true, reproveIdentity = true, resetPassword = true': async() => {
      queryCommandMock.resolves({ Items: [ getDynamoDBResponseObject(AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY, { blocked: false, suspended: true, reproveIdentity: true, resetPassword: true }) ] });
    },
    //blocked
    'internal pairwise subject id corresponds to an account that has state: blocked = true, suspended = false, reproveIdentity = false, resetPassword = false': async() => {
      queryCommandMock.resolves({ Items: [ getDynamoDBResponseObject(AISInterventionTypes.AIS_ACCOUNT_BLOCKED, { blocked: true, suspended: false, reproveIdentity: false, resetPassword: false }) ] });
    },
    //non-existing
    'the internal pairwise subject id does not exist in the AIS database': async() => {
      queryCommandMock.resolves({ Items: [] });
    }
  }
}

describe('PACT verification', () => {
  afterAll(() => {
    closeServer();
  });
  it('will verify the json file', async () => {
    const verify = new Verifier(config);
    await verify.verifyProvider();
  })
})
