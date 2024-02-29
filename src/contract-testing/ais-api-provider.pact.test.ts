import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBClient, InternalServerError, QueryCommand } from "@aws-sdk/client-dynamodb";
import { closeServer, setupServer } from "./test-helpers/mock-server";
import { Verifier, VerifierOptions } from "@pact-foundation/pact";

const port = 8080;
const ddbMock = mockClient(DynamoDBClient);
const queryCommandMock = ddbMock.on(QueryCommand);
setupServer(port)

const config: VerifierOptions = {
  providerBaseUrl: `http://127.0.0.1:${port}`,
  pactUrls: [`${__dirname}/pacts`],
  provider: 'Account Intervention Service',
  logLevel: 'debug',
  stateHandlers: {
    'provider is healthy': async () => {
      queryCommandMock.resolves({ Items: [] });
    },
    'provider is not healthy': async () => {
      const error = new InternalServerError({ message: 'Internal Server Error.', $metadata: { httpStatusCode: 500 }})
      queryCommandMock.rejects(error);
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
