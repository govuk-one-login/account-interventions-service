import { SQSEvent, Context } from 'aws-lambda';
import logger from '../commons/logger';
import { TxMAEgressDeletionEvent, TxMAEgressEvent } from '../data-types/interfaces';
import { sendBatchSqsMessage } from '../services/send-sqs-message';
import { addMetric, metric } from '../commons/metrics';
import { MetricNames } from '../data-types/constants';

export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  logger.addContext(context);

  if (!process.env['ACCOUNT_DELETION_SQS_QUEUE']) {
    logger.error('ACCOUNT_DELETION_SQS_QUEUE env variable is not set');
    throw new Error('ACCOUNT_DELETION_SQS_QUEUE env variable is not set');
  }
  const accountDeletionSqsQueue = process.env['ACCOUNT_DELETION_SQS_QUEUE'];

  if (!process.env['ACCOUNT_INTERVENTION_SQS_QUEUE']) {
    logger.error('ACCOUNT_INTERVENTION_SQS_QUEUE env variable is not set');
    throw new Error('ACCOUNT_INTERVENTION_SQS_QUEUE env variable is not set');
  }
  const accountInterventionEventsQueue = process.env['ACCOUNT_INTERVENTION_SQS_QUEUE'];

  if (!event.Records[0]) {
    logger.error('The event does not contain any records.');
    return;
  }

  const deletionMessages = [];
  const interventionMessages = [];
  let id = 0;
  for (const record of event.Records) {
    const body: TxMAEgressEvent = JSON.parse(record.body);
    if (body.event_name === 'AUTH_DELETE_ACCOUNT') {
      addMetric(MetricNames.RECIEVED_TXMA_ACCOUNT_DELETE);
      const deletionEvent: TxMAEgressDeletionEvent = { event_name: 'AUTH_DELETE_ACCOUNT', user_id: body.user_id };
      const messageBody = {
        Message: JSON.stringify(deletionEvent),
      };
      deletionMessages.push({
        Id: id + '',
        MessageBody: JSON.stringify(messageBody),
      });
    } else {
      addMetric(MetricNames.RECIEVED_TXMA_ACCOUNT_INTERVENTION);
      interventionMessages.push({
        Id: id + '',
        MessageBody: record.body,
      });
    }
    id = id + 1;
  }

  if (deletionMessages.length > 0) {
    await sendBatchSqsMessage(deletionMessages, accountDeletionSqsQueue);
  }
  if (interventionMessages.length > 0) {
    await sendBatchSqsMessage(interventionMessages, accountInterventionEventsQueue);
  }

  metric.publishStoredMetrics();
  return;
};
