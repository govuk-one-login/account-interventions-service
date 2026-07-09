import { SQSEvent } from 'aws-lambda';
import logger from '../commons/logger';
import { addMetric, metric } from '../commons/metrics';
import { MetricNames } from '../data-types/constants';
import jsonSafeParse from '../commons/json-safe-parse';
import { MessageService } from '../services/message-service';

export interface Config {
  interventionMessageService: MessageService;
  deletionMessageService: MessageService;
}

export async function processTxmaEvents(event: SQSEvent, config: Config): Promise<void> {
  if (!event.Records[0]) {
    logger.error('The event does not contain any records.');
    return;
  }

  const deletionMessages = [];
  const interventionMessages = [];

  for (const [id, record] of event.Records.entries()) {
    const parseResult = jsonSafeParse(record.body);

    if (!parseResult.success) {
      logger.error('The event contains an invalid record.');
      addMetric(MetricNames.TXMA_HANDLER_INVALID_EVENT);
      continue;
    }

    const body = parseResult.data;

    if (!(typeof body === 'object' && body && 'event_name' in body)) {
      logger.error('The event contains an invalid record.');
      addMetric(MetricNames.TXMA_HANDLER_INVALID_EVENT);
      continue;
    }

    const message = {
      Id: String(id),
      MessageBody: record.body,
    };

    if (body.event_name === 'AUTH_DELETE_ACCOUNT') {
      addMetric(MetricNames.RECIEVED_TXMA_ACCOUNT_DELETE);
      deletionMessages.push(message);
    } else {
      addMetric(MetricNames.RECIEVED_TXMA_ACCOUNT_INTERVENTION);
      interventionMessages.push(message);
    }
  }

  const promiseList = [];

  if (deletionMessages.length > 0) promiseList.push(config.deletionMessageService.sendBatchMessage(deletionMessages));
  if (interventionMessages.length > 0)
    promiseList.push(config.interventionMessageService.sendBatchMessage(interventionMessages));

  await Promise.all(promiseList);

  metric.publishStoredMetrics();
}
