import { AppConfigService } from './app-config-service';
import tracer from '../commons/tracer';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { SendMessageCommand, SendMessageCommandOutput, SQSClient } from '@aws-sdk/client-sqs';
import { TxMAEgressEvent, TxMAEgressEventName, TxMAEgressExtensions, TxMAIngressEvent } from '../data-types/interfaces';
import logger from '../commons/logger';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { COMPONENT_ID, EventsEnum, MetricNames, userLedActionList } from '../data-types/constants';
import { logAndPublishMetric } from '../commons/metrics';

const appConfig = AppConfigService.getInstance();

const sqsClient = tracer.captureAWSv3Client(
  new SQSClient({
    region: appConfig.awsRegion,
    maxAttempts: 2,
    requestHandler: new NodeHttpHandler({ requestTimeout: 5000 }),
  }),
);

/**
 * Function that sends Audit Events to the TxMA Egress queue.
 * @param eventName - The event name used for sending off the event to identify the action taken.
 * @param eventEnum
 * @param ingressTxmaEvent
 * @param appliedAt
 * @returns - Response from sending the message to the Queue.
 */
export async function sendAuditEvent(
  eventName: TxMAEgressEventName,
  eventEnum: EventsEnum,
  ingressTxmaEvent: TxMAIngressEvent,
  appliedAt?: number,
): Promise<SendMessageCommandOutput | undefined> {
  logger.debug('sendAuditEvent function.');

  const timestamp = getCurrentTimestamp();

  const txmaEvent: TxMAEgressEvent = {
    timestamp: timestamp.seconds,
    event_timestamp_ms: timestamp.milliseconds,
    event_timestamp_ms_formatted: timestamp.isoString,
    component_id: COMPONENT_ID,
    event_name: eventName,
    user: { user_id: ingressTxmaEvent.user.user_id },
    extensions: buildExtensions(ingressTxmaEvent, eventEnum, appliedAt),
  };

  const input = { MessageBody: JSON.stringify(txmaEvent), QueueUrl: appConfig.txmaEgressQueueUrl };

  try {
    logger.debug('Attempting to send TxMA event to the queue.');
    const response = await sqsClient.send(new SendMessageCommand(input));
    logAndPublishMetric(MetricNames.PUBLISHED_EVENT_TO_TXMA);
    return response;
  } catch {
    logAndPublishMetric(MetricNames.ERROR_PUBLISHING_EVENT_TO_TXMA);
    logger.error('An error happened while trying to send the audit event to the TxMA queue.');
  }
}

/**
 * Helper function to build extension object based on the type of event
 * @param event - Original event received from TxMA
 * @param eventEnum - Event name as an EventEnum
 * @param appliedAt - optional timestamp of when then event transition was applied
 * @returns - TxMAEgressExtensions object
 */
function buildExtensions(event: TxMAIngressEvent, eventEnum: EventsEnum, appliedAt?: number): TxMAEgressExtensions {
  return {
    eventType: userLedActionList.includes(eventEnum) ? 'USER_LED_ACTION' : 'TICF_ACCOUNT_INTERVENTION',
    event: eventEnum,
    intervention_code: event.extensions?.intervention?.intervention_code,
    reason: event.extensions?.intervention?.intervention_reason,
    appliedAt,
  };
}
