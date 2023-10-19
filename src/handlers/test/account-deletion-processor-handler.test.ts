import { handler } from '../account-deletion-processor-handler';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import logger from '../../commons/logger';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

jest.mock('../services/app-config-service');
jest.mock('../commons/logger');

describe('Account Deletion Processor', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });


  it('should update the item in DynamoDB and log info', async () => {
    const mockUpdateItemCommand = mockClient(DynamoDBClient).on(UpdateItemCommand);
    mockUpdateItemCommand.resolves('');

    const loggerInfoSpy = jest.spyOn(logger, 'info');

    await handler({ pk });

    expect(loggerInfoSpy).toHaveBeenCalledWith(`Sensitive info - Account  marked as deleted`);
  });

  // it('should update the item in DynamoDB and log info', async () => {
  //   const mockUpdateItemCommand = mockClient(DynamoDBClient).on(UpdateItemCommand);
  //   // mockUpdateItemCommand.resolvesOnce({ pk: string })
  //
  //   const event = await (new handler('table_name'));
  //
  //   expect(event.send).toHaveBeenCalledTimes(1);
  //   expect(event.send).toHaveBeenCalledWith(mockUpdateItemCommand);
  // });
});



  //
  // it('should log error if DynamoDB update fails', async () => {
  //   const pk = 'test-pk';
  //   const maxRetentionSeconds = 60;
  //   const ttl = Date.now() + maxRetentionSeconds * 1000;
  //
  //   mockAppConfigService.maxRetentionSeconds = maxRetentionSeconds;
  //   mockAppConfigService.tableName = 'test-table-name';
  //
  //   const mockError = new Error('DynamoDB update failed');
  //   mockDynamoDBClient.send.mockRejectedValueOnce(mockError);
