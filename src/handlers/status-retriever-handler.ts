/* istanbul ignore start -- production only */

import type { Context, APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import logger from '../commons/logger';
import { getPersistentInterventionEventsService } from '../tables/intervention-events';
import { getPersistentAccountStatusService } from '../tables/account-status';
import { retrieveStatus } from './status-retriever';

const accountStatusService = getPersistentAccountStatusService();
const interventionEventsService = getPersistentInterventionEventsService();

/**
 * Status Retriever Handler. Queries DynamoDB and returns the intervention status of the account.
 * @param event - Event passed in from API Gateway.
 * @param context - This object provides methods and properties that provide information about the invocation, function, and execution environment.
 * @returns - The status of the account when matched with the User ID. Returns a default object if unable to do so. Also returns the relevant status code.
 */
export async function handle(event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> {
  logger.addContext(context);
  return retrieveStatus(event, accountStatusService, interventionEventsService);
}

/* istanbul ignore stop */
