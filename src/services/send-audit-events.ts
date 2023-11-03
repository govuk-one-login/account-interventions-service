import { AppConfigService } from './app-config-service';
import tracer from '../commons/tracer';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { SendMessageCommand, SendMessageCommandOutput, SQSClient } from '@aws-sdk/client-sqs';
import { TxMAEgressEvent, TxMAEgressEventName, TxMAEgressExtensions, TxmaUser } from '../data-types/interfaces';
import logger from '../commons/logger';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { COMPONENT_ID, MetricNames } from '../data-types/constants';
import { logAndPublishMetric } from '../commons/metrics';

const appConfig = AppConfigService.getInstance();

const sqsClient = tracer.captureAWSv3Client(
  new SQSClient({
    region: appConfig.awsRegion,
    maxAttempts: 2,
    requestHandler: new NodeHttpHandler({ requestTimeout: 5000 }),
  }),
);

export async function sendAuditEvent(
  eventName: TxMAEgressEventName,
  txmaUser: TxmaUser,
  txmaExtensions: TxMAEgressExtensions,
): Promise<SendMessageCommandOutput> {
  logger.debug('sendAuditEvent function.');

  const timestamps = getCurrentTimestamp();
  const txmaEvent: TxMAEgressEvent = {
    timestamp: timestamps.seconds,
    event_timestamp_ms: timestamps.milliseconds,
    event_timestamp_ms_formatted: timestamps.isoString,
    component_id: COMPONENT_ID,
    event_name: eventName,
    user: txmaUser,
    extensions: txmaExtensions,
  };

  const input = { MessageBody: JSON.stringify(txmaEvent), QueueUrl: appConfig.txmaQueueUrl };

  try {
    logger.debug('Attempting to send TxMA event to the queue.');
    const response = await sqsClient.send(new SendMessageCommand(input));
    logAndPublishMetric(MetricNames.PUBLISHED_EVENT_TO_TXMA);
    return response;
  } catch (error: unknown) {
    logAndPublishMetric(MetricNames.ERROR_PUBLISHING_EVENT_TO_TXMA);
    logger.error('An error happened while trying to send the audit event to the TxMA queue.');
    throw error;
  }
}
