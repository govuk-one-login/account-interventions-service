import type { Context, APIGatewayEvent } from 'aws-lambda';
import logger from '../commons/logger';
import { DynamoDbService as DynamoDatabaseService } from '../services/dynamo-db-service';
import { AppConfigService } from '../services/app-config-service';
import { StateDetails } from '../data-types/interfaces';

const appConfig = AppConfigService.getInstance();
export const handle = async (event: APIGatewayEvent, context: Context): Promise<void> => {
  logger.addContext(context);
  logger.debug(JSON.stringify(event));
  const userId = 'AIS-test-user-id';
  const dynamoDBServiceInstance = new DynamoDatabaseService(appConfig.tableName);
  const newUserAccountState: StateDetails = {
    blocked: false,
    suspended: true,
    resetPassword: false,
    reproveIdentity: false,
  };
  const updateItemCommandOutput = await dynamoDBServiceInstance.putItemForUserId(userId, newUserAccountState);
  logger.debug(
    'received response from dynamodb service request. StatusCode: ' + updateItemCommandOutput.$metadata.httpStatusCode,
  );

  const getItemResponse = await dynamoDBServiceInstance.retrieveRecordsByUserId(userId);
  logger.debug(JSON.stringify(getItemResponse));
};
