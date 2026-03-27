import { SQSEvent, Context } from 'aws-lambda';
import logger from '../commons/logger';
import { TxMAEgressEvent } from '../data-types/interfaces';
import { sendBatchSqsMessage } from '../services/send-sqs-message';
import { addMetric, metric } from '../commons/metrics';
import { COMPONENT_ID, MetricNames } from '../data-types/constants';
import { AUTH_DELETE_ACCOUNT } from '@govuk-one-login/event-catalogue/AUTH_DELETE_ACCOUNT';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';

export async function handler(event: SQSEvent, context: Context): Promise<void> {
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
    const body = JSON.parse(record.body) as TxMAEgressEvent;
    if (body.event_name === 'AUTH_DELETE_ACCOUNT') {
      addMetric(MetricNames.RECIEVED_TXMA_ACCOUNT_DELETE);
      const timestamp = getCurrentTimestamp();

      const deletionEvent: AUTH_DELETE_ACCOUNT = {
        event_name: 'AUTH_DELETE_ACCOUNT',
        component_id: COMPONENT_ID,
        timestamp: timestamp.seconds,
        event_timestamp_ms: timestamp.milliseconds,
        ...(body.user?.user_id && { user: { user_id: body.user.user_id } }),
      };
      const messageBody = {
        Message: JSON.stringify(deletionEvent),
      };
      deletionMessages.push({
        Id: String(id),
        MessageBody: JSON.stringify(messageBody),
      });
    } else {
      addMetric(MetricNames.RECIEVED_TXMA_ACCOUNT_INTERVENTION);
      interventionMessages.push({
        Id: String(id),
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
}
