import express from 'express';
import { handle } from '../../handlers/status-retriever-handler';
import { ContextExamples } from '@aws-lambda-powertools/commons';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

let result: APIGatewayProxyResult;
let server: any;
export function setupServer(port: number) {
  const app = express();

  app.get('/ais/:userId', async (request, response) => {
    const apiGatewayEvent = createDefaultApiRequest(request.params['userId']);
    try {
      // if (!request.params['userId']) {
      //   return (new ApiException(400, 'Invalid Request.'));
      // }
      result = await handle(apiGatewayEvent, ContextExamples.helloworldContext);
      if (result.statusCode === 200) {
        response.send(JSON.parse(result.body));
      }
      if (result.statusCode === 500) {
        return response.status(500).json({ success: false, message: 'Internal Server Error.' });
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.name);
        console.error(error.message);
      }
    }
  });

  server = app.listen(port, () => {
    console.log(`mock server listening on port ${port}`);
  });
}

export function closeServer() {
  if (server) {
    console.log('shutting down server');
    server.close();
  }
}

const createDefaultApiRequest = (userIdPathParameter: string): APIGatewayProxyEvent => ({
  httpMethod: 'get',
  body: '',
  headers: {},
  isBase64Encoded: false,
  multiValueHeaders: {},
  multiValueQueryStringParameters: {},
  path: '/',
  pathParameters: {
    userId: userIdPathParameter,
  },
  queryStringParameters: {},
  requestContext: {
    accountId: '123456789012',
    apiId: '1234',
    authorizer: {},
    httpMethod: 'get',
    identity: {
      accessKey: '',
      accountId: '',
      apiKey: '',
      apiKeyId: '',
      caller: '',
      clientCert: {
        clientCertPem: '',
        issuerDN: '',
        serialNumber: '',
        subjectDN: '',
        validity: { notAfter: '', notBefore: '' },
      },
      cognitoAuthenticationProvider: '',
      cognitoAuthenticationType: '',
      cognitoIdentityId: '',
      cognitoIdentityPoolId: '',
      principalOrgId: '',
      sourceIp: '',
      user: '',
      userAgent: '',
      userArn: '',
    },
    path: '/hello',
    protocol: 'HTTP/1.1',
    requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
    requestTimeEpoch: 1_428_582_896_000,
    resourceId: '123456',
    resourcePath: '/hello',
    stage: 'dev',
  },
  resource: '',
  stageVariables: {},
});

export class ApiException extends Error {
  public status: number;
  public override message: string;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
  }
}
