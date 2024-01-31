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
 * @param egressEventName - The event name used for sending off the event to identify the action taken.
 * @param ingressEventName - The name of the event as an EventsEnum
 * @param ingressTxMAEvent - The original event from TxMA
 * @param accountStateEngineOutput - Current state after applying intervention
 * @returns - Response from sending the message to the Queue.
 */
export async function sendAuditEvent(
  egressEventName: TxMAEgressEventName,
  ingressEventName: EventsEnum,
  ingressTxMAEvent: TxMAIngressEvent,
  accountStateEngineOutput?: AccountStateEngineOutput,
): Promise<SendMessageCommandOutput | undefined> {
  logger.debug('sendAuditEvent function.');

  if (eventShouldBeIgnored(egressEventName, ingressEventName, accountStateEngineOutput)) return;

  const timestamp = getCurrentTimestamp();

  const txmaEvent: TxMAEgressEvent = {
    timestamp: timestamp.seconds,
    event_timestamp_ms: timestamp.milliseconds,
    event_timestamp_ms_formatted: timestamp.isoString,
    component_id: COMPONENT_ID,
    event_name: egressEventName,
    user: { user_id: ingressTxMAEvent.user.user_id },
    extensions: buildExtensions(ingressTxMAEvent, ingressEventName, egressEventName, accountStateEngineOutput),
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
 * @param txMAIngressEvent - Original event received from TxMA
 * @param ingressEventName - Event name as an EventEnum
 * @param stateEngineOutput - Final state after intervention was/ was not applied
 * @param egressEventName - The name of the TxMA event name
 * @returns - TxMAEgressExtensions object
 */
function buildExtensions(
  txMAIngressEvent: TxMAIngressEvent,
  ingressEventName: EventsEnum,
  egressEventName: TxMAEgressEventName,
  stateEngineOutput: AccountStateEngineOutput | undefined,
): TxMAEgressExtensions | TxMAEgressBasicExtensions {
  if (stateEngineOutput) {
    return {
      trigger_event: txMAIngressEvent.event_name,
      trigger_event_id: txMAIngressEvent.event_id ?? 'UNKNOWN',
      intervention_code: txMAIngressEvent.extensions?.intervention?.intervention_code,
      ...txMAIngressEvent.extensions?.intervention,
      description: userLedActionList.includes(ingressEventName)
        ? 'USER_LED_ACTION'
        : stateEngineOutput.interventionName!,
      allowable_interventions: stateEngineOutput.nextAllowableInterventions.filter(
        (intervention) => !nonInterventionsCodes.has(intervention),
      ),
      ...buildAdditionalAttributes(stateEngineOutput, egressEventName),
    };
  }
  return {
    trigger_event: txMAIngressEvent.event_name,
    trigger_event_id: txMAIngressEvent.event_id ?? 'UNKNOWN',
    intervention_code: txMAIngressEvent.extensions?.intervention?.intervention_code,
  };
}

/**
 * Helper function to build state and action attributes of the extension object based on the final state
 * @param stateEngineOutput - Final state after intervention was/ was not applied
 * @param egressEventName - The name of the TxMA event name
 * @returns - an object having state and action as attributes
 */
function buildAdditionalAttributes(
  stateEngineOutput: AccountStateEngineOutput,
  egressEventName: TxMAEgressEventName,
): { state: State | undefined; action: ActiveStateActions | undefined } {
  if (egressEventName === 'AIS_EVENT_IGNORED_ACCOUNT_DELETED')
    return {
      state: State.DELETED,
      action: undefined,
    };

  if (stateEngineOutput.stateResult.blocked)
    return {
      state: State.PERMANENTLY_SUSPENDED,
      action: undefined,
    };

  if (!stateEngineOutput.stateResult.suspended) {
    return {
      state: State.ACTIVE,
      action: undefined,
    };
  }

  if (stateEngineOutput.stateResult.resetPassword && !stateEngineOutput.stateResult.reproveIdentity) {
    return {
      state: State.ACTIVE,
      action: ActiveStateActions.RESET_PASSWORD,
    };
  }

  if (!stateEngineOutput.stateResult.resetPassword && stateEngineOutput.stateResult.reproveIdentity) {
    return {
      state: State.ACTIVE,
      action: ActiveStateActions.REPROVE_IDENTITY,
    };
  }

  if (stateEngineOutput.stateResult.resetPassword && stateEngineOutput.stateResult.reproveIdentity) {
    return {
      state: State.ACTIVE,
      action: ActiveStateActions.RESET_PASSWORD_AND_REPROVE_IDENTITY,
    };
  }

  if (stateEngineOutput.stateResult.suspended) {
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

/**
 * Function to check if an event should be sent to TxMA
 * @param egressEventName - Name of the event to be published to TxMA
 * @param ingressEventName - Name of the original event
 * @param accountStateEngineOutput - optional parameter containing the output from the State Engine
 */
function eventShouldBeIgnored(
  egressEventName: TxMAEgressEventName,
  ingressEventName: EventsEnum,
  accountStateEngineOutput?: AccountStateEngineOutput,
) {
  if (!accountStateEngineOutput) return false;
  return (
    userLedActionList.includes(ingressEventName) &&
    !accountStateEngineOutput.stateResult.suspended &&
    !accountStateEngineOutput.stateResult.blocked &&
    !accountStateEngineOutput.stateResult.reproveIdentity &&
    !accountStateEngineOutput.stateResult.resetPassword &&
    egressEventName === 'AIS_EVENT_TRANSITION_IGNORED'
  );
}
