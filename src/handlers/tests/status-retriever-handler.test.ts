/* eslint-disable unicorn/no-null, unicorn/numeric-separators-style */
import type { APIGatewayEvent, APIGatewayProxyEventQueryStringParameters } from 'aws-lambda';
import { handle } from '../status-retriever-handler';
import logger from '../../commons/logger';
import { DynamoDatabaseService } from '../../services/dynamo-database-service';
import { addMetric } from '../../commons/metrics';
import jestOpenAPI from 'jest-openapi';

jestOpenAPI(`${__dirname}/../../specs/api.yaml`);

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

const mockConfig = {
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
      intervention: 'AIS_ACCOUNT_SUSPENDED',
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
      intervention: {
        updatedAt: 123455,
        appliedAt: 12345685809,
        sentAt: 123456789,
        description: suspendedRecord.intervention,
        reprovedIdentityAt: 849473,
        resetPasswordAt: 5847392,
      },
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
    const payload = JSON.parse(response.body);
    expect(payload).toEqual(suspendedAccount);
    expect(payload).toSatisfySchemaInApiSpec('InterventionStatusResponse');
  });

  it('will return a message if user ID cannot be found in the database', async () => {
    const accountNotFoundDefaultObject = {
      intervention: {
        updatedAt: 1685404800000,
        appliedAt: 1685404800000,
        sentAt: 1685404800000,
        description: 'AIS_NO_INTERVENTION',
      },
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
    const payload = JSON.parse(response.body);
    expect(payload).toEqual(accountNotFoundDefaultObject);
    expect(payload).toSatisfySchemaInApiSpec('InterventionStatusResponse');
  });

  it('will return the correct response from the database if the user ID matches an account where the state items are all false', async () => {
    const accountFoundNotSuspendedRecord = {
      pk: 'testUserID',
      intervention: 'AIS_NO_INTERVENTION',
      updatedAt: 123455,
      appliedAt: 12345685809,
      sentAt: 123456789,
      reprovedIdentityAt: 849473,
      resetPasswordAt: 5847392,
      deletedAt: 12345685809,
      blocked: false,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
      auditLevel: 'standard',
      ttl: 1234567890,
      history: [],
    };

    const accountIsNotSuspended = {
      intervention: {
        updatedAt: 123455,
        appliedAt: 12345685809,
        sentAt: 123456789,
        description: accountFoundNotSuspendedRecord.intervention,
        reprovedIdentityAt: 849473,
        resetPasswordAt: 5847392,
        accountDeletedAt: 12345685809,
      },
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
    const payload = JSON.parse(response.body);
    expect(payload).toEqual(accountIsNotSuspended);
    expect(payload).toSatisfySchemaInApiSpec('InterventionStatusResponse');
  });

  it('will return a 400 error if the request has a missing user id in path parameters', async () => {
    const invalidPathParameters = {
      proxy: '/ais/{user_id}',
      userId: undefined,
    };
    const invalidTestEvent = { ...testEvent, pathParameters: invalidPathParameters };
    const response = await handle(invalidTestEvent, mockConfig);
    expect(response.statusCode).toBe(400);
    const payload = JSON.parse(response.body);
    expect(payload).toEqual({ message: 'Invalid Request.' });
    expect(payload).toSatisfySchemaInApiSpec('Error');
  });

  it('will return a standard 200 response when there is a request with an encoded user id', async () => {
    const suspendedRecord = {
      pk: 'test&User?ID',
      intervention: 'AIS_ACCOUNT_SUSPENDED',
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
      intervention: {
        updatedAt: 123455,
        appliedAt: 12345685809,
        sentAt: 123456789,
        description: suspendedRecord.intervention,
        reprovedIdentityAt: 849473,
        resetPasswordAt: 5847392,
      },
      state: {
        blocked: false,
        suspended: true,
        resetPassword: false,
        reproveIdentity: false,
      },
      auditLevel: 'standard',
    };

    mockDynamoDBServiceRetrieveRecords(testEvent.pathParameters ? ['userId'] : encodeURIComponent('test&User?ID'));
    mockDynamoDBServiceRetrieveRecords.mockResolvedValueOnce(suspendedRecord);
    const response = await handle(testEvent, mockConfig);
    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload).toEqual(suspendedAccount);
    expect(payload).toSatisfySchemaInApiSpec('InterventionStatusResponse');
  });

  it('will return a default response if the userId contains whitespace and cannot find a userId that matches', async () => {
    const accountNotFoundDefaultObject = {
      intervention: {
        updatedAt: 1685404800000,
        appliedAt: 1685404800000,
        sentAt: 1685404800000,
        description: 'AIS_NO_INTERVENTION',
      },
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
    expect(logger.warn).toBeCalledWith('Attribute invalid: user_id is empty.');
    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload).toEqual(accountNotFoundDefaultObject);
    expect(payload).toSatisfySchemaInApiSpec('InterventionStatusResponse');
  });

  it('will return the correct response if there is a problem with the query to dynamoDB', async () => {
    mockDynamoDBServiceRetrieveRecords.mockRejectedValueOnce('There was a problem with the query operation');
    const response = await handle(testEvent, mockConfig);
    expect(response.statusCode).toBe(500);
    const payload = JSON.parse(response.body);
    expect(payload).toEqual({ message: 'Internal Server Error.' });
    expect(payload).toSatisfySchemaInApiSpec('Error');
  });

  it('will return the correct updatedAt field if the field is returned as null', async () => {
    const nullUpdatedAt = {
      pk: 'testUserID',
      intervention: 'AIS_FORCED_USER_PASSWORD_RESET',
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
      intervention: {
        updatedAt: 1685404800000,
        appliedAt: 12345685809,
        sentAt: 123456789,
        description: nullUpdatedAt.intervention,
        reprovedIdentityAt: 849473,
        resetPasswordAt: 5847392,
      },
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
    const payload = JSON.parse(response.body);
    expect(payload).toEqual(updatedTime);
    expect(payload).toSatisfySchemaInApiSpec('InterventionStatusResponse');
  });

  it('will add the history field to the default object if no user id is passed in but the query parameters are', async () => {
    const queryParameters: APIGatewayProxyEventQueryStringParameters = { ['history']: 'true' };
    const accountNotFoundDefaultObject = {
      intervention: {
        updatedAt: 1685404800000,
        appliedAt: 1685404800000,
        sentAt: 1685404800000,
        description: 'AIS_NO_INTERVENTION',
      },
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
    const payload = JSON.parse(response.body);
    expect(payload).toEqual(accountNotFoundDefaultObject);
    expect(payload).toSatisfySchemaInApiSpec('InterventionStatusResponse');
  });

  it('will add in the history field to the response returned from dynamo db if query parameters are passed in', async () => {
    const accountFoundNotSuspendedRecord = {
      pk: 'testUserID',
      intervention: 'AIS_ACCOUNT_SUSPENDED',
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
      intervention: {
        updatedAt: 123455,
        appliedAt: 12345685809,
        sentAt: 123456789,
        description: accountFoundNotSuspendedRecord.intervention,
        reprovedIdentityAt: 849473,
        resetPasswordAt: 5847392,
      },
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
    const payload = JSON.parse(response.body);
    expect(payload).toEqual(accountIsNotSuspended);
    expect(payload).toSatisfySchemaInApiSpec('InterventionStatusResponse');
  });

  it('will return the history field as an object', async () => {
    const accountFoundNotSuspendedRecord = {
      pk: 'testUserID',
      intervention: 'AIS_NO_INTERVENTION',
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
      history: ['123456|TICF_CRI|01|reason|originating_component_id|intervention_predecessor_id|requester_id'],
    };

    const accountIsNotSuspended = {
      intervention: {
        updatedAt: 123455,
        appliedAt: 12345685809,
        sentAt: 123456789,
        description: accountFoundNotSuspendedRecord.intervention,
        reprovedIdentityAt: 849473,
        resetPasswordAt: 5847392,
      },
      state: {
        blocked: false,
        suspended: false,
        resetPassword: false,
        reproveIdentity: false,
      },
      auditLevel: 'standard',
      history: [
        {
          code: '01',
          component: 'TICF_CRI',
          intervention: 'FRAUD_SUSPEND_ACCOUNT',
          originatingComponent: 'originating_component_id',
          originatorReferenceId: 'intervention_predecessor_id',
          reason: 'reason',
          requesterId: 'requester_id',
          sentAt: '1970-01-01T00:02:03.456Z',
        },
      ],
    };

    const queryParameters: APIGatewayProxyEventQueryStringParameters = { ['history']: 'true' };
    const addedQueryParameterTestEvent = { ...testEvent, queryStringParameters: queryParameters };
    mockDynamoDBServiceRetrieveRecords(testEvent.pathParameters ? ['userId'] : 'some user');
    mockDynamoDBServiceRetrieveRecords.mockResolvedValueOnce(accountFoundNotSuspendedRecord);
    const response = await handle(addedQueryParameterTestEvent, mockConfig);
    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload).toEqual(accountIsNotSuspended);
    expect(payload).toSatisfySchemaInApiSpec('InterventionStatusResponse');
  });

  it('will publish a metric if a history string is malformed and continue processing the others', async () => {
    const accountFoundNotSuspendedRecord = {
      pk: 'testUserID',
      intervention: 'AIS_ACCOUNT_UNBLOCKED',
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
      history: [
        '123456|TICF_CRI|01|reason|originating_component_id|intervention_predecessor_id|requester_id',
        'something|somethingElse',
        '7895646|TICF_CRI|02|reason|originating_component_id|intervention_predecessor_id|requester_id',
        'anotherInvalidString',
      ],
    };

    const accountIsNotSuspended = {
      intervention: {
        updatedAt: 123455,
        appliedAt: 12345685809,
        sentAt: 123456789,
        description: accountFoundNotSuspendedRecord.intervention,
        reprovedIdentityAt: 849473,
        resetPasswordAt: 5847392,
      },
      state: {
        blocked: false,
        suspended: false,
        resetPassword: false,
        reproveIdentity: false,
      },
      auditLevel: 'standard',
      history: [
        {
          code: '01',
          component: 'TICF_CRI',
          intervention: 'FRAUD_SUSPEND_ACCOUNT',
          originatingComponent: 'originating_component_id',
          originatorReferenceId: 'intervention_predecessor_id',
          reason: 'reason',
          requesterId: 'requester_id',
          sentAt: '1970-01-01T00:02:03.456Z',
        },
        {
          code: '02',
          component: 'TICF_CRI',
          intervention: 'FRAUD_UNSUSPEND_ACCOUNT',
          originatingComponent: 'originating_component_id',
          originatorReferenceId: 'intervention_predecessor_id',
          reason: 'reason',
          requesterId: 'requester_id',
          sentAt: '1970-01-01T02:11:35.646Z',
        },
      ],
    };

    const error = new Error('History string does not contain the right amount of components.');

    const queryParameters: APIGatewayProxyEventQueryStringParameters = { ['history']: 'true' };
    const addedQueryParameterTestEvent = { ...testEvent, queryStringParameters: queryParameters };
    mockDynamoDBServiceRetrieveRecords(testEvent.pathParameters ? ['userId'] : 'some user');
    mockDynamoDBServiceRetrieveRecords.mockResolvedValueOnce(accountFoundNotSuspendedRecord);
    const response = await handle(addedQueryParameterTestEvent, mockConfig);
    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload).toEqual(accountIsNotSuspended);
    expect(payload).toSatisfySchemaInApiSpec('InterventionStatusResponse');
    expect(logger.error).toBeCalledWith('History string is malformed.', { error });
    expect(addMetric).toBeCalled();
  });
});
