import logger from '../commons/logger';
import { DynamoDbService as DynamoDatabaseService } from '../services/dynamo-db-service';
import { LOGS_PREFIX_SENSITIVE_INFO } from '../data-types/constants';
import { AppConfigService } from '../services/app-config-service';
import type { Context, SNSMessage, SQSEvent, SQSRecord } from 'aws-lambda';
import { DeleteStatusUpdateSNSMessage } from '../data-types/interfaces';

const appConfig = AppConfigService.getInstance();
const ddbService = new DynamoDatabaseService(appConfig.tableName);

export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  logger.addContext(context);
  if (!event.Records[0] || event.Records.length === 0) {
    logger.error('The event does not contain any records.');
    return;
  }

  const updateVCsByIdPromises = event.Records.map((record) => {
    const userId = getUserId(record);
    return userId ? updateDeleteStatusId(userId) : undefined;
  }).filter((prom) => prom !== undefined);
  await Promise.all(updateVCsByIdPromises);
};

function getUserId(record: SQSRecord) {
  let messageBody: SNSMessage;
  let message: DeleteStatusUpdateSNSMessage;
  try {
    messageBody = JSON.parse(record.body);
    message = JSON.parse(messageBody.Message);
  } catch {
    logger.error('The SQS message can not be accessed.');
    return;
  }
  if (!message.hasOwnProperty('user_id')) {
    logger.warn('Attribute missing: user_id.');
    return;
  }

  const userId = message.user_id;

  if (typeof userId !== 'string') {
    logger.warn('Attribute invalid: user_id is not a string.');
    return;
  }

  if (userId.trim() === '') {
    logger.warn('Attribute invalid: user_id is empty.');
    return;
  }
  return userId.trim();
}

async function updateDeleteStatusId(userId: string) {
  try {
    await ddbService.updateDeleteStatus(userId);
    logger.info(`${LOGS_PREFIX_SENSITIVE_INFO} Account ${userId} marked as deleted`);
  } catch (error) {
    logger.error(`${LOGS_PREFIX_SENSITIVE_INFO} Error updating account ${userId}`, { error });
  }
}
