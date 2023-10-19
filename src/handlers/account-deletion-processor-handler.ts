import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import logger from '../commons/logger';
import { LOGS_PREFIX_SENSITIVE_INFO } from '../data-types/constants';
import { AppConfigService } from '../services/app-config-service' ;

const dynamodbClient = new DynamoDBClient();
const appConfig = AppConfigService.getInstance();

export const handler = async (user_id: { pk: string }): Promise<void> => {
  const pk = user_id.pk;
  const ttl = Date.now() + appConfig.maxRetentionSeconds * 1000;

  const parameters = {
    TableName: appConfig.tableName,
    Key: {
      pk: { S: pk },
    },
    UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted, #ttl = :ttl',
    ExpressionAttributeNames: {
      '#isAccountDeleted': 'isAccountDeleted',
      '#ttl': 'ttl',
    },
    ExpressionAttributeValues: {
      ':isAccountDeleted': { BOOL: true },
      ':ttl': { N: ttl.toString() },
    },
    ConditionExpression: 'attribute_exists(pk)',
  };

  const command = new UpdateItemCommand(parameters);

  try {
    await dynamodbClient.send(command);
    logger.info(`${LOGS_PREFIX_SENSITIVE_INFO} Account ${pk} marked as deleted`);
  } catch (error) {
    logger.error(`${LOGS_PREFIX_SENSITIVE_INFO} Error updating account ${pk}`, { error });
  }
};
