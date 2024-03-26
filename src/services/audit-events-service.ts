import { AppConfigService } from './app-config-service';
import tracer from '../commons/tracer';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { SendMessageCommand, SendMessageCommandOutput, SQSClient } from '@aws-sdk/client-sqs';
import {
  AccountStateEngineOutput,
  StateDetails,
  TxMAEgressBasicExtensions,
  TxMAEgressEvent,
  TxMAEgressEventName,
  TxMAEgressEventTransitionType,
  TxMAEgressExtensions,
  TxMAIngressEvent,
} from '../data-types/interfaces';
import logger from '../commons/logger';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import {
  ActiveStateActions,
  AISInterventionTypes,
  COMPONENT_ID,
  EventsEnum,
  MetricNames,
  State,
  userLedActionList,
} from '../data-types/constants';
import { addMetric } from '../commons/metrics';
import { transitionConfiguration } from './account-states/config';

const appConfig = AppConfigService.getInstance();

const sqsClient = tracer.captureAWSv3Client(
  new SQSClient({
    region: appConfig.awsRegion,
    maxAttempts: 2,
    requestHandler: new NodeHttpHandler({ requestTimeout: 5000 }),
  }),
);

export class AuditEvents {
  constructor(
    private egressEventTransitionType: TxMAEgressEventTransitionType,
    private ingressEventName: EventsEnum,
    private ingressTxMAEvent: TxMAIngressEvent,
    private accountStateEngineOutput?: AccountStateEngineOutput,
  ) {}

  /**
   * Function that sends Audit Events to the TxMA Egress queue.
   * @returns - Response from sending the message to the Queue.
   */
  public async send(): Promise<SendMessageCommandOutput | undefined> {
    logger.debug('sendAuditEvent function.');

    if (this.eventShouldBeIgnored()) return;

    const timestamp = getCurrentTimestamp();

    const txmaEvent = <TxMAEgressEvent>{
      timestamp: timestamp.seconds,
      event_timestamp_ms: timestamp.milliseconds,
      event_timestamp_ms_formatted: timestamp.isoString,
      component_id: COMPONENT_ID,
      event_name: this.extractEgressEventName(),
      user: { user_id: this.ingressTxMAEvent.user.user_id },
      extensions: this.buildExtensions(),
    };

    const input = { MessageBody: JSON.stringify(txmaEvent), QueueUrl: appConfig.txmaEgressQueueUrl };

    try {
      logger.debug('Attempting to send TxMA event to the queue.');
      const response = await sqsClient.send(new SendMessageCommand(input));
      addMetric(MetricNames.PUBLISHED_EVENT_TO_TXMA);
      return response;
    } catch (error) {
      addMetric(MetricNames.ERROR_PUBLISHING_EVENT_TO_TXMA);
      logger.error('An error happened while trying to send the audit event to the TxMA queue.', { error: error });
    }
  }

  /**
   * Function to check if an event should be sent to TxMA
   */
  private eventShouldBeIgnored() {
    if (!this.accountStateEngineOutput) return false;

    const accountState = this.accountStateEngineOutput.stateResult;

    return (
      userLedActionList.includes(this.ingressEventName) &&
      !accountState.suspended &&
      !accountState.blocked &&
      !accountState.reproveIdentity &&
      !accountState.resetPassword &&
      this.egressEventTransitionType === TxMAEgressEventTransitionType.TRANSITION_IGNORED
    );
  }

  private extractEgressEventName() {
    const prefix =
      this.ingressEventName === EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION
        ? 'AIS_NON_FRAUD_'
        : 'AIS_EVENT_';

    return (prefix + this.egressEventTransitionType) as TxMAEgressEventName;
  }

  /**
   * Helper function to build extension object based on the type of event
   * @returns - TxMAEgressExtensions object
   */
  private buildExtensions() {
    if (this.accountStateEngineOutput) {
      return <TxMAEgressExtensions>{
        trigger_event: this.ingressTxMAEvent.event_name,
        trigger_event_id: this.ingressTxMAEvent.event_id ?? 'UNKNOWN',
        ...this.ingressTxMAEvent.extensions?.intervention,
        description: this.buildDescription(this.accountStateEngineOutput.interventionName!),
        allowable_interventions: this.filterInterventions(this.accountStateEngineOutput.nextAllowableInterventions),
        ...this.buildAdditionalAttributes(this.accountStateEngineOutput.stateResult),
      };
    }

    return <TxMAEgressBasicExtensions>{
      trigger_event: this.ingressTxMAEvent.event_name,
      trigger_event_id: this.ingressTxMAEvent.event_id ?? 'UNKNOWN',
      ...this.ingressTxMAEvent.extensions?.intervention,
    };
  }

  private buildDescription(interventionName: AISInterventionTypes) {
    if (userLedActionList.includes(this.ingressEventName)) {
      return 'USER_LED_ACTION';
    }

    return interventionName;
  }

  private filterInterventions(nextAllowableInterventions: string[]) {
    return nextAllowableInterventions.filter(
      (intervention) => transitionConfiguration.edges[intervention]?.interventionName,
    );
  }

  /**
   * Helper function to build state and action attributes of the extension object based on the final state
   * @returns - an object having state and action as attributes
   */
  private buildAdditionalAttributes(accountState: StateDetails) {
    if (this.egressEventTransitionType === TxMAEgressEventTransitionType.IGNORED_ACCOUNT_DELETED)
      return {
        state: State.DELETED,
        action: undefined,
      };

    if (accountState.blocked)
      return {
        state: State.PERMANENTLY_SUSPENDED,
        action: undefined,
      };

    if (!accountState.suspended)
      return {
        state: State.ACTIVE,
        action: undefined,
      };

    if (accountState.resetPassword && !accountState.reproveIdentity)
      return {
        state: State.ACTIVE,
        action: ActiveStateActions.RESET_PASSWORD,
      };

    if (!accountState.resetPassword && accountState.reproveIdentity)
      return {
        state: State.ACTIVE,
        action: ActiveStateActions.REPROVE_IDENTITY,
      };

    if (accountState.resetPassword && accountState.reproveIdentity)
      return {
        state: State.ACTIVE,
        action: ActiveStateActions.RESET_PASSWORD_AND_REPROVE_IDENTITY,
      };

    if (accountState.suspended)
      return {
        state: State.SUSPENDED,
        action: undefined,
      };

    return {
      state: undefined,
      action: undefined,
    };
  }
}
