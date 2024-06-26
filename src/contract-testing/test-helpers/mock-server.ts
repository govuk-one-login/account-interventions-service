import express from 'express';
import { handle } from '../../handlers/status-retriever-handler';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

let result: APIGatewayProxyResult;

const dummyContext = {
  callbackWaitsForEmptyEventLoop: true,
  functionVersion: '$LATEST',
  functionName: 'foo-bar-function',
  memoryLimitInMB: '128',
  logGroupName: '/aws/lambda/foo-bar-function-123456abcdef',
  logStreamName: '2021/03/09/[$LATEST]abcdef123456abcdef123456abcdef123456',
  invokedFunctionArn: 'arn:aws:lambda:eu-west-1:123456789012:function:foo-bar-function',
  awsRequestId: 'c6af9ac6-7b61-11e6-9a41-93e812345678',
  getRemainingTimeInMillis: () => 1234,
  done: () => console.log('Done!'),
  fail: () => console.log('Failed!'),
  succeed: () => console.log('Succeeded!'),
};

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
let server: any;

export function setupServer(port: number) {
  const app = express();
  app.disable('x-powered-by');

  app.get('/V1/ais/:userId', async (request, response) => {
    const apiGatewayEvent = createDefaultApiRequest(request.params['userId']);
    try {
      result = await handle(apiGatewayEvent, dummyContext);
      response.status(result.statusCode).json(JSON.parse(result.body));
    } catch (error) {
      console.log(`The operation had an unexpected outcome: ${error}`);
      response.status(500).json(`The call to the handler was unsuccessful: ${error}`);
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
