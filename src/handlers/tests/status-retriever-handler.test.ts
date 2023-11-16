/* eslint-disable unicorn/no-null, unicorn/numeric-separators-style */
import type { APIGatewayEvent, APIGatewayProxyEventQueryStringParameters } from 'aws-lambda';
import { ContextExamples } from '@aws-lambda-powertools/commons';
import { handle } from '../status-retriever-handler';
import logger from '../../commons/logger';
import { DynamoDatabaseService } from '../../services/dynamo-database-service';

jest.mock('../../commons/logger.ts');
jest.mock('../../commons/metrics');
jest.mock('../../services/dynamo-database-service');
jest.mock('@smithy/node-http-handler');

const testEvent: APIGatewayEvent = {
  body: null,
  headers: {},
  multiValueHeaders: {},
  httpMethod: 'POST',
  isBase64Encoded: false,
  path: '/path/to/resource',
  pathParameters: {
    proxy: '/ais/{user_id}',
    userId: 'testUserID',
  },
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {
    accountId: '123456789012',
    apiId: '1234567890',
    authorizer: {},
    protocol: 'HTTP/1.1',
    httpMethod: 'POST',
    identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      clientCert: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: '127.0.0.1',
      userArn: null,
      userAgent: 'Custom User Agent String',
      user: null,
    },
    path: '/prod/path/to/resource',
    stage: 'prod',
    requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
    requestTime: '09/Apr/2015:12:34:56 +0000',
    requestTimeEpoch: 1428582896000,
    resourceId: '123456',
    resourcePath: '/{proxy+}',
  },
  resource: '/{proxy+}',
};

const mockConfig = ContextExamples.helloworldContext;
const mockDynamoDBServiceRetrieveRecords = DynamoDatabaseService.prototype.getFullAccountInformation as jest.Mock;

describe('status-retriever-handler', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2023, 4, 30)));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('will return the correct response from the database if the user ID matches', async () => {
    const suspendedRecord = {
      pk: 'testUserID',
      intervention: 'some intervention',
      updatedAt: 123455,
      appliedAt: 12345685809,
      sentAt: 123456789,
      reprovedIdentityAt: 849473,
      resetPasswordAt: 5847392,
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: false,
      auditLevel: 'standard',
      ttl: 1234567890,
      history: 'some intervention',
    };

    const suspendedAccount = {
      updatedAt: 123455,
      appliedAt: 12345685809,
      sentAt: 123456789,
      description: suspendedRecord.intervention,
      reprovedIdentityAt: 849473,
      resetPasswordAt: 5847392,
      state: {
        blocked: false,
        suspended: true,
        resetPassword: false,
        reproveIdentity: false,
      },
      auditLevel: 'standard',
    };

    mockDynamoDBServiceRetrieveRecords(testEvent.pathParameters ? ['userId'] : 'testUserID');
    mockDynamoDBServiceRetrieveRecords.mockResolvedValueOnce(suspendedRecord);
    const response = await handle(testEvent, mockConfig);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ intervention: suspendedAccount });
  });

  it('will return a message if user ID cannot be found in the database', async () => {
    const accountNotFoundDefaultObject = {
      updatedAt: 1685404800000,
      appliedAt: 1685404800000,
      sentAt: 1685404800000,
      description: 'AIS_NO_INTERVENTION',
      state: {
        blocked: false,
        suspended: false,
        resetPassword: false,
        reproveIdentity: false,
      },
      auditLevel: 'standard',
    };

    mockDynamoDBServiceRetrieveRecords(testEvent.pathParameters ? ['userId'] : 'some user');
    const response = await handle(testEvent, mockConfig);
    expect(logger.info).toBeCalledWith('Query matched no records in DynamoDB.');
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ intervention: accountNotFoundDefaultObject });
  });

  it('will return the correct response from the database if the user ID matches an account where the state items are all false', async () => {
    const accountFoundNotSuspendedRecord = {
      pk: 'testUserID',
      intervention: 'no intervention',
      updatedAt: 123455,
      appliedAt: 12345685809,
      sentAt: 123456789,
      reprovedIdentityAt: 849473,
      resetPasswordAt: 5847392,
      blocked: false,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
      auditLevel: 'standard',
      ttl: 1234567890,
      history: [],
    };

    const accountIsNotSuspended = {
      updatedAt: 123455,
      appliedAt: 12345685809,
      sentAt: 123456789,
      description: accountFoundNotSuspendedRecord.intervention,
      reprovedIdentityAt: 849473,
      resetPasswordAt: 5847392,
      state: {
        blocked: false,
        suspended: false,
        resetPassword: false,
        reproveIdentity: false,
      },
      auditLevel: 'standard',
    };

    mockDynamoDBServiceRetrieveRecords(testEvent.pathParameters ? ['userId'] : 'testUserID');
    mockDynamoDBServiceRetrieveRecords.mockResolvedValueOnce(accountFoundNotSuspendedRecord);
    const response = await handle(testEvent, mockConfig);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ intervention: accountIsNotSuspended });
  });

  it('will return a 400 error if the request has a missing user id in path parameters', async () => {
    const invalidPathParameters = {
      proxy: '/ais/{user_id}',
      userId: undefined,
    };
    const invalidTestEvent = { ...testEvent, pathParameters: invalidPathParameters };
    const response = await handle(invalidTestEvent, mockConfig);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ message: 'Invalid Request.' });
  });

  it('will return a standard 200 response when there is a request with an encoded user id', async () => {
    const suspendedRecord = {
      pk: encodeURIComponent('testUserID'),
      intervention: 'some intervention',
      updatedAt: 123455,
      appliedAt: 12345685809,
      sentAt: 123456789,
      reprovedIdentityAt: 849473,
      resetPasswordAt: 5847392,
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: false,
      auditLevel: 'standard',
      ttl: 1234567890,
      history: 'some intervention',
    };

    const suspendedAccount = {
      updatedAt: 123455,
      appliedAt: 12345685809,
      sentAt: 123456789,
      description: suspendedRecord.intervention,
      reprovedIdentityAt: 849473,
      resetPasswordAt: 5847392,
      state: {
        blocked: false,
        suspended: true,
        resetPassword: false,
        reproveIdentity: false,
      },
      auditLevel: 'standard',
    };

    mockDynamoDBServiceRetrieveRecords(testEvent.pathParameters ? ['userId'] : encodeURIComponent('testUserID'));
    mockDynamoDBServiceRetrieveRecords.mockResolvedValueOnce(suspendedRecord);
    const response = await handle(testEvent, mockConfig);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ intervention: suspendedAccount });
  });

  it('will return a default response if the userId contains whitespace and cannot find a userId that matches', async () => {
    const accountNotFoundDefaultObject = {
      updatedAt: 1685404800000,
      appliedAt: 1685404800000,
      sentAt: 1685404800000,
      description: 'AIS_NO_INTERVENTION',
      state: {
        blocked: false,
        suspended: false,
        resetPassword: false,
        reproveIdentity: false,
      },
      auditLevel: 'standard',
    };

    const invalidPathParameters = {
      proxy: '/ais/{user_id}',
      userId: ' ',
    };
    const invalidTestEvent = { ...testEvent, pathParameters: invalidPathParameters };
    const response = await handle(invalidTestEvent, mockConfig);
    expect(logger.warn).toBeCalledTimes(1);
    expect(logger.warn).toBeCalledWith('Attribute invalid: user_id is empty.')
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ intervention: accountNotFoundDefaultObject });
  });

  it('will return the correct response if there is a problem with the query to dynamoDB', async () => {
    mockDynamoDBServiceRetrieveRecords.mockRejectedValueOnce('There was a problem with the query operation');
    const response = await handle(testEvent, mockConfig);
    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual(JSON.stringify({ message: 'Internal Server Error.' }));
  });

  it('will return the correct updatedAt field if the field is returned as null', async () => {
    const nullUpdatedAt = {
      pk: 'testUserID',
      intervention: 'some intervention',
      updatedAt: null,
      appliedAt: 12345685809,
      sentAt: 123456789,
      reprovedIdentityAt: 849473,
      resetPasswordAt: 5847392,
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: false,
      auditLevel: 'standard',
      ttl: 1234567890,
      history: 'some intervention',
    };

    const updatedTime = {
      updatedAt: 1685404800000,
      appliedAt: 12345685809,
      sentAt: 123456789,
      description: nullUpdatedAt.intervention,
      reprovedIdentityAt: 849473,
      resetPasswordAt: 5847392,
      state: {
        blocked: false,
        suspended: true,
        resetPassword: false,
        reproveIdentity: false,
      },
      auditLevel: 'standard',
    };

    mockDynamoDBServiceRetrieveRecords.mockResolvedValueOnce(nullUpdatedAt);
    const response = await handle(testEvent, mockConfig);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ intervention: updatedTime });
  });

  it('will add the history field to the default object if no user id is passed in but the query parameters are', async () => {
    const queryParameters: APIGatewayProxyEventQueryStringParameters = { ['history']: 'true' };
    const accountNotFoundDefaultObject = {
      updatedAt: 1685404800000,
      appliedAt: 1685404800000,
      sentAt: 1685404800000,
      description: 'AIS_NO_INTERVENTION',
      state: {
        blocked: false,
        suspended: false,
        resetPassword: false,
        reproveIdentity: false,
      },
      auditLevel: 'standard',
      history: [],
    };

    const addedQueryParameterTestEvent = { ...testEvent, queryStringParameters: queryParameters };
    mockDynamoDBServiceRetrieveRecords(testEvent.pathParameters ? ['userId'] : 'some user');
    const response = await handle(addedQueryParameterTestEvent, mockConfig);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ intervention: accountNotFoundDefaultObject });
  });

  it('will add in the history field to the response returned from dynamo db if query parameters are passed in', async () => {
    const accountFoundNotSuspendedRecord = {
      pk: 'testUserID',
      intervention: 'no intervention',
      updatedAt: 123455,
      appliedAt: 12345685809,
      sentAt: 123456789,
      reprovedIdentityAt: 849473,
      resetPasswordAt: 5847392,
      blocked: false,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
      auditLevel: 'standard',
      ttl: 1234567890,
      history: [],
    };

    const accountIsNotSuspended = {
      updatedAt: 123455,
      appliedAt: 12345685809,
      sentAt: 123456789,
      description: accountFoundNotSuspendedRecord.intervention,
      reprovedIdentityAt: 849473,
      resetPasswordAt: 5847392,
      state: {
        blocked: false,
        suspended: false,
        resetPassword: false,
        reproveIdentity: false,
      },
      auditLevel: 'standard',
      history: [],
    };

    const queryParameters: APIGatewayProxyEventQueryStringParameters = { ['history']: 'true' };
    const addedQueryParameterTestEvent = { ...testEvent, queryStringParameters: queryParameters };
    mockDynamoDBServiceRetrieveRecords(testEvent.pathParameters ? ['userId'] : 'some user');
    mockDynamoDBServiceRetrieveRecords.mockResolvedValueOnce(accountFoundNotSuspendedRecord);
    const response = await handle(addedQueryParameterTestEvent, mockConfig);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ intervention: accountIsNotSuspended });
  });
});
