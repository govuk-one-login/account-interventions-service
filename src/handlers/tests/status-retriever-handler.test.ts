/* eslint-disable unicorn/no-null, unicorn/numeric-separators-style */
import type { APIGatewayEvent } from 'aws-lambda';
import { ContextExamples } from '@aws-lambda-powertools/commons';
import { handle } from '../status-retriever-handler';
import logger from '../../commons/logger';
import { marshall } from '@aws-sdk/util-dynamodb';
import { DynamoDbService } from '../../services/dynamo-db-service';

jest.mock('../../commons/logger.ts');
jest.mock('../../services/dynamo-db-service');
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

const invalidTestEvent: APIGatewayEvent = {
  body: null,
  headers: {},
  multiValueHeaders: {},
  httpMethod: 'POST',
  isBase64Encoded: false,
  path: '/path/to/resource',
  pathParameters: {
    proxy: '/ais/{user_id}',
    userId: ' ',
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
  history: ['some intervention'],
};

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
  history: ['no intervention'],
};

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
  history: ['some intervention'],
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

const updatedTime = {
  updatedAt: 1685404800000,
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

const mockConfig = ContextExamples.helloworldContext;
const mockDynamoDBServiceRetrieveRecords = DynamoDbService.prototype.retrieveRecordsByUserId as jest.Mock;

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
    mockDynamoDBServiceRetrieveRecords(testEvent.pathParameters ? ['userId'] : 'testUserID');
    mockDynamoDBServiceRetrieveRecords.mockResolvedValueOnce([marshall(suspendedRecord)]);
    const response = await handle(testEvent, mockConfig);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(JSON.stringify({ intervention: suspendedAccount }));
  });

  it('will return a message if user ID cannot be found in the database', async () => {
    const response = await handle(testEvent, mockConfig);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(JSON.stringify({ message: 'No suspension.' }));
  });

  it('will return the correct response from the database if the user ID matches an account where the state items are all false', async () => {
    mockDynamoDBServiceRetrieveRecords(testEvent.pathParameters ? ['userId'] : 'testUserID');
    mockDynamoDBServiceRetrieveRecords.mockResolvedValueOnce([marshall(accountFoundNotSuspendedRecord)]);
    const response = await handle(testEvent, mockConfig);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(JSON.stringify({ message: 'No suspension.' }));
  });

  it('will return the appropiate response if the event is malformed', async () => {
    const response = await handle(invalidTestEvent, mockConfig);
    expect(logger.error).toBeCalledTimes(2);
    expect(logger.error).toBeCalledWith('Attribute invalid: user_id is empty.');
    expect(logger.error).toBeCalledWith('Subject ID is possibly undefined or empty');
    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(JSON.stringify({ message: 'Invalid Request.' }));
  });

  it('will return the correct response if there is a problem with the query to dynamoDB', async () => {
    mockDynamoDBServiceRetrieveRecords.mockReturnValueOnce('There was a problem with the query operation');
    const response = await handle(testEvent, mockConfig);
    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual(JSON.stringify({ message: 'Unable to retrieve records.' }));
  });

  it('will return the correct updatedAt field if the field is returned as null', async () => {
    mockDynamoDBServiceRetrieveRecords.mockResolvedValueOnce([marshall(nullUpdatedAt)]);
    const response = await handle(testEvent, mockConfig);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(JSON.stringify({ intervention: updatedTime }));
  });
});
