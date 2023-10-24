import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDbService } from '../dynamo-db-service';
import { logAndPublishMetric } from '../../commons/metrics';
import logger from '../../commons/logger';
import 'aws-sdk-client-mock-jest';

jest.mock('@aws-lambda-powertools/logger');
jest.mock('../../commons/metrics');
jest.mock('@smithy/node-http-handler');

describe('Dynamo DB Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

    const allVCS = await new DynamoDbService('abc').retrieveRecordsByUserId('abc');

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
    await new DynamoDbService('abc').retrieveRecordsByUserId('abc');
    expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, QueryCommandInput);
  });

  it('should throw an error if response is undefined', async () => {
    const mockedQueryCommand = mockClient(DynamoDBClient).on(QueryCommand);
    // @ts-ignore
    mockedQueryCommand.resolvesOnce(undefined);
    const loggerErrorSpy = jest.spyOn(logger, 'error');
    await expect(new DynamoDbService('abc').retrieveRecordsByUserId('abc')).rejects.toThrowError(
      expect.objectContaining({
        message: 'DynamoDB may have failed to query, returned a null response.',
      }),
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith('DynamoDB may have failed to query, returned a null response.');
    expect(logAndPublishMetric).toHaveBeenCalledWith('DB_QUERY_ERROR_NO_RESPONSE');
  });
});
