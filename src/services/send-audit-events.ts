import { AppConfigService } from './app-config-service';
import tracer from '../commons/tracer';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { SendMessageCommand, SendMessageCommandOutput, SQSClient } from '@aws-sdk/client-sqs';
import {
  AccountStateEngineOutput,
  TxMAEgressEvent,
  TxMAEgressEventName,
  TxMAEgressExtensions,
  TxMAIngressEvent,
} from '../data-types/interfaces';
import logger from '../commons/logger';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import {
  ActiveStateActions,
  COMPONENT_ID,
  EventsEnum,
  MetricNames,
  nonInterventionsCodes,
  State,
  userLedActionList,
} from '../data-types/constants';
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
 * @param eventEnum - The name of the event as an EventsEnum
 * @param ingressTxmaEvent - The original event from TxMA
 * @param currentState - Current state after applying intervention
 * @returns - Response from sending the message to the Queue.
 */
export async function sendAuditEvent(
  eventName: TxMAEgressEventName,
  eventEnum: EventsEnum,
  ingressTxmaEvent: TxMAIngressEvent,
  currentState: AccountStateEngineOutput,
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
    extensions: buildExtensions(ingressTxmaEvent, eventEnum, currentState, eventName),
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
 * @param finalState - Final state after intervention was/ was not applied
 * @param txmaEventName - The name of the TxMA event name
 * @returns - TxMAEgressExtensions object
 */
function buildExtensions(
  event: TxMAIngressEvent,
  eventEnum: EventsEnum,
  finalState: AccountStateEngineOutput,
  txmaEventName: TxMAEgressEventName,
): TxMAEgressExtensions {
  return {
    trigger_event: event.event_name,
    trigger_event_id: event.event_id ?? 'UNKNOWN',
    description: userLedActionList.includes(eventEnum) ? 'USER_LED_ACTION' : finalState.interventionName!,
    intervention_code: event.extensions?.intervention?.intervention_code,
    reason: event.extensions?.intervention?.intervention_reason,
    allowable_interventions: finalState.nextAllowableInterventions.filter(
      (intervention) => !nonInterventionsCodes.has(intervention),
    ),
    state: buildStateAttribute(finalState, eventEnum, txmaEventName),
    action: buildActionAttribute(finalState, eventEnum),
  };
}

function buildStateAttribute(
  finalState: AccountStateEngineOutput,
  eventEnum: EventsEnum,
  txmaEventName: TxMAEgressEventName,
): State | undefined {
  if (!finalState.finalState.suspended || (finalState.finalState.suspended && userLedActionList.includes(eventEnum)))
    return State.ACTIVE;
  if (finalState.finalState.suspended && !userLedActionList.includes(eventEnum)) return State.SUSPENDED;
  if (finalState.finalState.blocked) return State.PERMANENTLY_SUSPENDED;
  if (txmaEventName === 'AIS_EVENT_IGNORED_ACCOUNT_DELETED') return State.DELETED;
}

function buildActionAttribute(
  finalState: AccountStateEngineOutput,
  eventEnum: EventsEnum,
): ActiveStateActions | undefined {
  if (finalState.finalState.suspended && userLedActionList.includes(eventEnum)) {
    if (finalState.finalState.resetPassword && !finalState.finalState.reproveIdentity)
      return ActiveStateActions.RESET_PASSWORD;
    if (!finalState.finalState.resetPassword && finalState.finalState.reproveIdentity)
      return ActiveStateActions.REPROVE_IDENTITY;
    if (finalState.finalState.resetPassword && finalState.finalState.reproveIdentity)
      return ActiveStateActions.RESET_PASSWORD_AND_REPROVE_IDENTITY;
  }
  return undefined;
}
