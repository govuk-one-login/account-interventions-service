import { SQSEvent, Context } from 'aws-lambda';
import logger from '../commons/logger';
import { TxMAEgressEvent } from '../data-types/interfaces';
import { sendBatchSqsMessage } from '../services/send-sqs-message';
import { addMetric, metric } from '../commons/metrics';
import { MetricNames } from '../data-types/constants';
import { AccountDeleteMessage } from '../contracts/account-delete-message';

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

  for (const [id, record] of event.Records.entries()) {
    const body = JSON.parse(record.body) as TxMAEgressEvent;

    if (body.event_name === 'AUTH_DELETE_ACCOUNT') {
      addMetric(MetricNames.RECIEVED_TXMA_ACCOUNT_DELETE);

      const deletionEvent: AccountDeleteMessage = {
        event_name: 'AUTH_DELETE_ACCOUNT',
        user_id: getUserId(body),
      };
      deletionMessages.push({
        Id: String(id),
        MessageBody: JSON.stringify(deletionEvent),
      });
    } else {
      addMetric(MetricNames.RECIEVED_TXMA_ACCOUNT_INTERVENTION);
      interventionMessages.push({
        Id: String(id),
        MessageBody: record.body,
      });
    }
  }

  const promiseList = [];

  if (deletionMessages.length > 0) promiseList.push(sendBatchSqsMessage(deletionMessages, accountDeletionSqsQueue));
  if (interventionMessages.length > 0)
    promiseList.push(sendBatchSqsMessage(interventionMessages, accountInterventionEventsQueue));

  await Promise.all(promiseList);

  metric.publishStoredMetrics();
}

export function getUserId(event: TxMAEgressEvent): string | undefined {
  if ('user' in event) return event.user.user_id;

  if ('user_id' in event) {
    addMetric(MetricNames.DELETE_EVENT_USER_ID_ISSUE, undefined, undefined, {
      ISSUE: 'USER_ID_ON_TOP_LEVEL',
    });

    return event.user_id;
  }

  addMetric(MetricNames.DELETE_EVENT_USER_ID_ISSUE, undefined, undefined, {
    ISSUE: 'NO_USER_ID',
  });

  return undefined;
}
