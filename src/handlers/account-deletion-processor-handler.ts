import logger from '../commons/logger';
import type { Context, SQSEvent } from 'aws-lambda';
import { getPersistentAccountStatusService } from '../tables/account-status';
import { processAccountDeletion } from './account-deletion-processor';

const accountStatusService = getPersistentAccountStatusService();

/**
 * Account deletion processor handler. Updates accounts and marks them for deletion.
 * @param event - SQS event. Consumes these events from a queue and takes the User ID from the record to match the account.
 * @param context -  This object provides methods and properties that provide information about the invocation, function, and execution environment.
 * @returns - Void. Sends off response to DynamoDB.
 */
export async function handler(
  event: SQSEvent,
  context: Context,
): Promise<void> {
  logger.addContext(context);
  await processAccountDeletion(event, accountStatusService)
}

