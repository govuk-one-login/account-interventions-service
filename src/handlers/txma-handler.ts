import { SQSEvent, Context } from 'aws-lambda';
import logger from '../commons/logger';
import { processTxmaEvents } from './txma-processor';

const accountInterventionEventsQueue = process.env['ACCOUNT_INTERVENTION_SQS_QUEUE'];
const accountDeletionSqsQueue = process.env['ACCOUNT_DELETION_SQS_QUEUE'];

export async function handler(event: SQSEvent,
  context: Context
): Promise<void> {
  logger.addContext(context);

  if (!accountDeletionSqsQueue) {
    logger.error('ACCOUNT_DELETION_SQS_QUEUE env variable is not set');
    throw new Error('ACCOUNT_DELETION_SQS_QUEUE env variable is not set');
  }
  
  if (!accountInterventionEventsQueue) {
    logger.error('ACCOUNT_INTERVENTION_SQS_QUEUE env variable is not set');
    throw new Error('ACCOUNT_INTERVENTION_SQS_QUEUE env variable is not set');
  }

  await processTxmaEvents(event, accountDeletionSqsQueue, accountInterventionEventsQueue);
}
