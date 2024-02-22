import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { closeServer, setupServer } from "./test-helpers/mock-server";
import { Verifier, VerifierOptions } from "@pact-foundation/pact";

const port = 8080;
const ddbMock = mockClient(DynamoDBClient);
const queryCommandMock = ddbMock.on(QueryCommand);
setupServer(port)

//we will need to integrate with pact broker (instead of fetching pact file locally)
//once integrated with can set publishVerificationResult: true to publish result of test
const config: VerifierOptions = {
  providerBaseUrl: `http://127.0.0.1:${port}`,
  pactUrls: [`${__dirname}/pacts`],
  provider: 'Account Intervention Service',
  logLevel: 'debug',
  stateHandlers: {
    'provider is healthy': async () => {
      //we use mocks here to set up the different states
      //if we need to have any more states we can simply set the mock to behave accordingly
      queryCommandMock.resolves({ Items: []});
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
