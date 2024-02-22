import logger from '../commons/logger';
import { DynamoDatabaseService } from '../services/dynamo-database-service';
import { LOGS_PREFIX_SENSITIVE_INFO, MetricNames } from '../data-types/constants';
import { AppConfigService } from '../services/app-config-service';
import type { Context, SNSMessage, SQSEvent, SQSRecord } from 'aws-lambda';
import { DeleteStatusUpdateSNSMessage } from '../data-types/interfaces';
import { addMetric, metric } from '../commons/metrics';

const appConfig = AppConfigService.getInstance();
const ddbService = new DynamoDatabaseService(appConfig.tableName);

/**
 * Account deletion processor handler. Updates accounts and marks them for deletion.
 * @param event - SQS event. Consumes these events from a queue and takes the User ID from the record to match the account.
 * @param context -  This object provides methods and properties that provide information about the invocation, function, and execution environment.
 * @returns - Void. Sends off response to DynamoDB.
 */
export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  logger.addContext(context);
  if (!event.Records[0]) {
    logger.error('The event does not contain any records.');
    return;
  }

  const updateRecordsByIdPromises = event.Records.map((record) => {
    const userId = getUserId(record);
    return userId ? updateDeleteStatusId(userId) : undefined;
  }).filter((prom) => prom !== undefined);
  await Promise.all(updateRecordsByIdPromises);
  metric.publishStoredMetrics();
};

/**
 * Function to take the User ID from the SQS Record.
 * @param record - The record passed in from the event.
 * @returns - User ID as a string, with whitespace removed.
 */
function getUserId(record: SQSRecord) {
  let messageBody: SNSMessage;
  let message: DeleteStatusUpdateSNSMessage;
  try {
    messageBody = JSON.parse(record.body);
    message = JSON.parse(messageBody.Message);
  } catch {
    logger.error('The SQS message can not be parsed.');
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

/**
 * Function to call DynamoDB and mark the account as deleted.
 * @param userId - User ID taken from the record of the SQS Event.
 * @throws - Error if there is a problem updating the account.
 */
async function updateDeleteStatusId(userId: string) {
  try {
    await ddbService.updateDeleteStatus(userId);
  } catch (error) {
    logger.error(`${LOGS_PREFIX_SENSITIVE_INFO} Error updating account ${userId}`, { error });
    addMetric(MetricNames.MARK_AS_DELETED_FAILED);
    metric.publishStoredMetrics();
    throw new Error('Failed to update the account status.');
  }
}
