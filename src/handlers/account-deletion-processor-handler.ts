import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import logger from '../commons/logger';
import { LOGS_PREFIX_SENSITIVE_INFO } from '../data-types/constants';
import { AppConfigService } from '../services/app-config-service' ;
import type { Context, SQSEvent } from 'aws-lambda';

const dynamodbClient = new DynamoDBClient();
const appConfig = AppConfigService.getInstance();

export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  logger.addContext(context);
  if (!event.Records[0] || event.Records.length === 0 ) {
    logger.error("The event does not contain any records.");
    throw new Error;
  }

  let pk: string;

  try {
    const sqsMessage = JSON.parse(event.Records[0].body) as { pk : string };
    pk = sqsMessage.pk;
  } catch (error) {
    logger.error("The SNS message can not be accessed.");
    throw new Error;
  }

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
