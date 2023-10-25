import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../../handlers/account-deletion-processor-handler';
import { DynamoDBClient, QueryCommand, UpdateItemCommand, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { DynamoDbService as DynamoDatabaseService } from '../dynamo-db-service';
import { logAndPublishMetric } from '../../commons/metrics';
import logger from '../../commons/logger';
import 'aws-sdk-client-mock-jest';
import { ContextExamples } from '@aws-lambda-powertools/commons';
import { SQSEvent, SQSRecord } from 'aws-lambda';

jest.mock('@aws-lambda-powertools/logger');
jest.mock('../../commons/metrics');
jest.mock('@smithy/node-http-handler');

describe('Dynamo DB Service', () => {
  let mockEvent: SQSEvent;
  let mockRecord: SQSRecord;
  const mockContext = ContextExamples.helloworldContext;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2023, 4, 30)));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecord = {
      messageId: '',
      receiptHandle: '',
      body: JSON.stringify({ Message: JSON.stringify({ user_id: 'hello' }) }),
      attributes: {
        ApproximateReceiveCount: '',
        SentTimestamp: '',
        SenderId: '',
        ApproximateFirstReceiveTimestamp: '',
      },
      messageAttributes: {},
      md5OfBody: '',
      eventSource: '',
      eventSourceARN: '',
      awsRegion: '',
    };
    mockEvent = { Records: [mockRecord] };
  });

  const updateItem = [
    {
      level: 'INFO',
      message: 'Sensitive info - Account hello marked as deleted',
      service: 'ais-main-jl',
      timestamp: '2023-10-19T10:33:24.378Z',
      xray_trace_id: '1-653105f3-59092ab132456943679e5b36',
    },
  ] as any;

  const vcs = [
    {
      pk: 'urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9RGA9A4i',
      sk: 'SflKxwRJSMeKKF2QT4f_0GUcjhK',
      content: 'content',
      timestamp: '1684912310',
    },
    {
      pk: 'urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9RGA9A4i',
      sk: 'SflKxwRJSMeKKF2QT4f_13x4q7s',
      content: 'content',
      timestamp: '1684912310',
    },
    {
      pk: 'urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9RGA9A4i',
      sk: 'SflKxwRJSMeKKF2QT4f_1H3NllL',
      content: 'content',
      timestamp: '1684912313',
    },
  ] as any;

  it('should get all items successfully', async () => {
    const mockedQueryCommand = mockClient(DynamoDBClient).on(QueryCommand);
    mockedQueryCommand.resolvesOnce({ Items: vcs });

    const allVCS = await new DynamoDatabaseService('abc').retrieveRecordsByUserId('abc');

    expect(allVCS).toHaveLength(3);
    expect(allVCS).toEqual(vcs);
  });

  it('should check the parameters are being called correctly', async () => {
    const QueryCommandInput = {
      TableName: 'abc',
      KeyConditionExpression: '#pk = :id_value',
      ExpressionAttributeNames: { '#pk': 'pk' },
      ExpressionAttributeValues: { ':id_value': { S: 'abc' } },
    };
    const ddbMock = mockClient(DynamoDBClient);
    ddbMock.on(QueryCommand).resolves({ Items: vcs });
    await new DynamoDatabaseService('abc').retrieveRecordsByUserId('abc');
    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, QueryCommandInput);
  });

  it('should throw an error if response is undefined', async () => {
    const mockedQueryCommand = mockClient(DynamoDBClient).on(QueryCommand);
    // @ts-ignore
    mockedQueryCommand.resolvesOnce();
    const loggerErrorSpy = jest.spyOn(logger, 'error');
    await expect(new DynamoDatabaseService('abc').retrieveRecordsByUserId('abc')).rejects.toThrowError(
      expect.objectContaining({
        message: 'DynamoDB may have failed to query, returned a null response.',
      }),
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith('DynamoDB may have failed to query, returned a null response.');
    expect(logAndPublishMetric).toHaveBeenCalledWith('DB_QUERY_ERROR_NO_RESPONSE');
  });

  it('should update the status of the userId in DynamoDB and log info', async () => {
    const commandInput: UpdateItemCommandInput = {
      TableName: 'table_name',
      Key: { pk: { S: 'abc' } },
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#isAccountDeleted': 'isAccountDeleted',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':isAccountDeleted': { BOOL: true },
        ':ttl': { N: '123' },
      },
      ConditionExpression: 'attribute_exists(pk)',
    };

    const ddbMock = mockClient(DynamoDBClient);
    ddbMock.on(UpdateItemCommand).resolves(updateItem);

    const loggerInfoSpy = jest.spyOn(logger, 'info');

    await handler(mockEvent, mockContext);

    expect(ddbMock).toHaveReceivedCommandWith(UpdateItemCommand, commandInput);
    expect(loggerInfoSpy).toHaveBeenCalledWith(`Sensitive info - Account hello marked as deleted`);
  });
});
