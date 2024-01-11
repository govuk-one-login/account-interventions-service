import { AppConfigService } from './app-config-service';
import tracer from '../commons/tracer';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { SendMessageCommand, SendMessageCommandOutput, SQSClient } from '@aws-sdk/client-sqs';
import {
  AccountStateEngineOutput,
  TxMAEgressBasicExtensions,
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
 * @param finalState - Current state after applying intervention
 * @returns - Response from sending the message to the Queue.
 */
export async function sendAuditEvent(
  eventName: TxMAEgressEventName,
  eventEnum: EventsEnum,
  ingressTxmaEvent: TxMAIngressEvent,
  finalState?: AccountStateEngineOutput,
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
    extensions: buildExtensions(ingressTxmaEvent, eventEnum, eventName, finalState),
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
 * @param stateEngineOutput - Final state after intervention was/ was not applied
 * @param txmaEventName - The name of the TxMA event name
 * @returns - TxMAEgressExtensions object
 */
function buildExtensions(
  event: TxMAIngressEvent,
  eventEnum: EventsEnum,
  txmaEventName: TxMAEgressEventName,
  stateEngineOutput: AccountStateEngineOutput | undefined,
): TxMAEgressExtensions | TxMAEgressBasicExtensions {
  if (stateEngineOutput) {
    return {
      trigger_event: event.event_name,
      trigger_event_id: event.event_id ?? 'UNKNOWN',
      intervention_code: event.extensions?.intervention?.intervention_code,
      description: userLedActionList.includes(eventEnum) ? 'USER_LED_ACTION' : stateEngineOutput.interventionName!,
      allowable_interventions: stateEngineOutput.nextAllowableInterventions.filter(
        (intervention) => !nonInterventionsCodes.has(intervention),
      ),
      ...buildAdditionalAttributes(stateEngineOutput, txmaEventName),
    };
  }
  return {
    trigger_event: event.event_name,
    trigger_event_id: event.event_id ?? 'UNKNOWN',
    intervention_code: event.extensions?.intervention?.intervention_code,
  };
}

/**
 * Helper function to build state and action attributes of the extension object based on the final state
 * @param stateEngineOutput - Final state after intervention was/ was not applied
 * @param txmaEventName - The name of the TxMA event name
 * @returns - an object having state and action as attributes
 */
function buildAdditionalAttributes(
  stateEngineOutput: AccountStateEngineOutput,
  txmaEventName: TxMAEgressEventName,
): { state: State | undefined; action: ActiveStateActions | undefined } {
  if (txmaEventName === 'AIS_EVENT_IGNORED_ACCOUNT_DELETED')
    return {
      state: State.DELETED,
      action: undefined,
    };

  if (stateEngineOutput.finalState.blocked)
    return {
      state: State.PERMANENTLY_SUSPENDED,
      action: undefined,
    };

  if (!stateEngineOutput.finalState.suspended) {
    return {
      state: State.ACTIVE,
      action: undefined,
    };
  }

  if (stateEngineOutput.finalState.resetPassword && !stateEngineOutput.finalState.reproveIdentity) {
    return {
      state: State.ACTIVE,
      action: ActiveStateActions.RESET_PASSWORD,
    };
  }

  if (!stateEngineOutput.finalState.resetPassword && stateEngineOutput.finalState.reproveIdentity) {
    return {
      state: State.ACTIVE,
      action: ActiveStateActions.REPROVE_IDENTITY,
    };
  }

  if (stateEngineOutput.finalState.resetPassword && stateEngineOutput.finalState.reproveIdentity) {
    return {
      state: State.ACTIVE,
      action: ActiveStateActions.RESET_PASSWORD_AND_REPROVE_IDENTITY,
    };
  }

  if (stateEngineOutput.finalState.suspended) {
    return {
      state: State.SUSPENDED,
      action: undefined,
    };
  }

  return {
    state: undefined,
    action: undefined,
  };
}
