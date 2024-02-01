import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';
import { sendAuditEvent } from '../send-audit-events';
import {
  ActiveStateActions,
  AISInterventionTypes,
  COMPONENT_ID,
  EventsEnum,
  State,
  TriggerEventsEnum,
} from '../../data-types/constants';
import { logAndPublishMetric } from '../../commons/metrics';
import logger from '../../commons/logger';
import { AppConfigService } from '../app-config-service';
import { getCurrentTimestamp } from '../../commons/get-current-timestamp';
import 'aws-sdk-client-mock-jest';
import { TxMAIngressEvent } from '../../data-types/interfaces';

jest.mock('@aws-lambda-powertools/logger');
jest.mock('../../commons/metrics');
jest.mock('../../commons/get-current-timestamp', () => ({
  getCurrentTimestamp: jest.fn().mockImplementation(() => {
    return {
      milliseconds: 1_234_567_890,
      isoString: 'today',
      seconds: 1_234_567,
    };
  }),
}));

const ingressInterventionEvent: TxMAIngressEvent = {
  component_id: '',
  timestamp: 5,
  event_timestamp_ms: 5000,
  user: {
    user_id: 'testUserId',
  },
  event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
  event_id: '123',
  extensions: {
    intervention: {
      intervention_code: '01',
      intervention_reason: 'reason',
    },
  },
};

const ingressEventWithExtraInterventionData: TxMAIngressEvent = {
  component_id: '',
  timestamp: 5,
  event_timestamp_ms: 5000,
  user: {
    user_id: 'testUserId',
  },
  event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
  event_id: '123',
  extensions: {
    intervention: {
      intervention_code: '01',
      intervention_reason: 'reason',
      123: 'this is an extra field',
      another_extra_field: 'extra data',
    },
  },
};

const ingressUserActionEvent = {
  event_name: TriggerEventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
  event_id: '123',
  timestamp: 5,
  event_timestamp_ms: 5000,
  client_id: 'UNKNOWN',
  component_id: 'UNKNOWN',
  user: {
    user_id: 'testUserId',
    email: '',
    phone: 'UNKNOWN',
    ip_address: '',
    session_id: '',
    persistent_session_id: '',
    govuk_signin_journey_id: '',
  },
};

const sqsMock = mockClient(SQSClient);
const sqsCommandInputForUserAction = {
  QueueUrl: AppConfigService.getInstance().txmaEgressQueueUrl,
  MessageBody: JSON.stringify({
    timestamp: 1_234_567,
    event_timestamp_ms: 1_234_567_890,
    event_timestamp_ms_formatted: 'today',
    component_id: 'ACCOUNT_INTERVENTION_SERVICE',
    event_name: 'AIS_EVENT_TRANSITION_APPLIED',
    user: {
      user_id: 'testUserId',
    },
    extensions: {
      trigger_event: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
      trigger_event_id: '123',
      description: 'AIS_FORCED_USER_PASSWORD_RESET',
      allowable_interventions: [],
      state: State.ACTIVE,
      action: ActiveStateActions.RESET_PASSWORD,
    },
  }),
};

const sqsCommandInputForBlockIntervention = {
  QueueUrl: AppConfigService.getInstance().txmaEgressQueueUrl,
  MessageBody: JSON.stringify({
    timestamp: 1_234_567,
    event_timestamp_ms: 1_234_567_890,
    event_timestamp_ms_formatted: 'today',
    component_id: COMPONENT_ID,
    event_name: 'AIS_EVENT_TRANSITION_APPLIED',
    user: { user_id: 'testUserId' },
    extensions: {
      trigger_event: 'TICF_ACCOUNT_INTERVENTION',
      trigger_event_id: '123',
      intervention_code: '01',
      intervention_reason: 'reason',
      description: AISInterventionTypes.AIS_ACCOUNT_BLOCKED,
      allowable_interventions: [],
      state: State.PERMANENTLY_SUSPENDED,
    },
  }),
};

const sqsCommandInputForDeletedAccount = {
  QueueUrl: AppConfigService.getInstance().txmaEgressQueueUrl,
  MessageBody: JSON.stringify({
    timestamp: 1_234_567,
    event_timestamp_ms: 1_234_567_890,
    event_timestamp_ms_formatted: 'today',
    component_id: COMPONENT_ID,
    event_name: 'AIS_EVENT_IGNORED_ACCOUNT_DELETED',
    user: { user_id: 'testUserId' },
    extensions: {
      trigger_event: 'TICF_ACCOUNT_INTERVENTION',
      trigger_event_id: '123',
      intervention_code: '01',
      intervention_reason: 'reason',
      description: AISInterventionTypes.AIS_ACCOUNT_SUSPENDED,
      allowable_interventions: [],
      state: State.DELETED,
    },
  }),
};

const sqsCommandInputForSuspendIntervention = {
  QueueUrl: AppConfigService.getInstance().txmaEgressQueueUrl,
  MessageBody: JSON.stringify({
    timestamp: 1_234_567,
    event_timestamp_ms: 1_234_567_890,
    event_timestamp_ms_formatted: 'today',
    component_id: COMPONENT_ID,
    event_name: 'AIS_EVENT_TRANSITION_APPLIED',
    user: { user_id: 'testUserId' },
    extensions: {
      trigger_event: 'TICF_ACCOUNT_INTERVENTION',
      trigger_event_id: '123',
      intervention_code: '01',
      intervention_reason: 'reason',
      description: AISInterventionTypes.AIS_ACCOUNT_SUSPENDED,
      allowable_interventions: ['01'],
      state: State.SUSPENDED,
    },
  }),
};

const sqsCommandInputForUnsuspendIntervention = {
  QueueUrl: AppConfigService.getInstance().txmaEgressQueueUrl,
  MessageBody: JSON.stringify({
    timestamp: 1_234_567,
    event_timestamp_ms: 1_234_567_890,
    event_timestamp_ms_formatted: 'today',
    component_id: COMPONENT_ID,
    event_name: 'AIS_EVENT_TRANSITION_APPLIED',
    user: { user_id: 'testUserId' },
    extensions: {
      trigger_event: 'TICF_ACCOUNT_INTERVENTION',
      trigger_event_id: '123',
      intervention_code: '01',
      intervention_reason: 'reason',
      description: AISInterventionTypes.AIS_ACCOUNT_UNSUSPENDED,
      allowable_interventions: ['01'],
      state: State.ACTIVE,
    },
  }),
};

const sqsCommandInputForFutureInterventions = {
  QueueUrl: AppConfigService.getInstance().txmaEgressQueueUrl,
  MessageBody: JSON.stringify({
    timestamp: 1_234_567,
    event_timestamp_ms: 1_234_567_890,
    event_timestamp_ms_formatted: 'today',
    component_id: COMPONENT_ID,
    event_name: 'AIS_EVENT_IGNORED_IN_FUTURE',
    user: { user_id: 'testUserId' },
    extensions: {
      trigger_event: 'TICF_ACCOUNT_INTERVENTION',
      trigger_event_id: '123',
      intervention_code: '01',
      intervention_reason: 'reason'
    },
  }),
};

const sqsCommandInputForSuspendUserAction = {
  QueueUrl: AppConfigService.getInstance().txmaEgressQueueUrl,
  MessageBody: JSON.stringify({
    timestamp: 1_234_567,
    event_timestamp_ms: 1_234_567_890,
    event_timestamp_ms_formatted: 'today',
    component_id: COMPONENT_ID,
    event_name: 'AIS_EVENT_TRANSITION_APPLIED',
    user: { user_id: 'testUserId' },
    extensions: {
      trigger_event: 'TICF_ACCOUNT_INTERVENTION',
      trigger_event_id: '123',
      intervention_code: '01',
      intervention_reason: 'reason',
      description: 'AIS_FORCED_USER_IDENTITY_VERIFY',
      allowable_interventions: [],
      state: State.ACTIVE,
      action: ActiveStateActions.REPROVE_IDENTITY,
    },
  }),
};

const sqsCommandInputForSuspendUserActionReproveIdentityAndResetPass = {
  QueueUrl: AppConfigService.getInstance().txmaEgressQueueUrl,
  MessageBody: JSON.stringify({
    timestamp: 1_234_567,
    event_timestamp_ms: 1_234_567_890,
    event_timestamp_ms_formatted: 'today',
    component_id: COMPONENT_ID,
    event_name: 'AIS_EVENT_TRANSITION_APPLIED',
    user: { user_id: 'testUserId' },
    extensions: {
      trigger_event: 'TICF_ACCOUNT_INTERVENTION',
      trigger_event_id: '123',
      intervention_code: '01',
      intervention_reason: 'reason',
      description: 'AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY',
      allowable_interventions: [],
      state: State.ACTIVE,
      action: ActiveStateActions.RESET_PASSWORD_AND_REPROVE_IDENTITY,
    },
  }),
};

const sqsInputWithExtraFields = {
  QueueUrl: AppConfigService.getInstance().txmaEgressQueueUrl,
  MessageBody: JSON.stringify({
    timestamp: 1_234_567,
    event_timestamp_ms: 1_234_567_890,
    event_timestamp_ms_formatted: 'today',
    component_id: COMPONENT_ID,
    event_name: 'AIS_EVENT_TRANSITION_APPLIED',
    user: { user_id: 'testUserId' },
    extensions: {
      trigger_event: 'TICF_ACCOUNT_INTERVENTION',
      trigger_event_id: '123',
      intervention_code: '01',
      intervention_reason: 'reason',
      123: 'this is an extra field',
      another_extra_field: 'extra data',
      description: 'AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY',
      allowable_interventions: [],
      state: State.ACTIVE,
      action: ActiveStateActions.RESET_PASSWORD_AND_REPROVE_IDENTITY,
    },
  }),
};

describe('send-audit-events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sqsMock.resetHistory();
  });

  it('should successfully send the audit event and return a response when a user action event is received', async () => {
    sqsMock.on(SendMessageCommand).resolves({ $metadata: { httpStatusCode: 200 } });
    const response = await sendAuditEvent(
      'AIS_EVENT_TRANSITION_APPLIED',
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      ingressUserActionEvent,
      {
        nextAllowableInterventions: [],
        interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET,
        stateResult: { blocked: false, suspended: true, reproveIdentity: false, resetPassword: true },
      },
    );
    expect(response).toEqual({ $metadata: { httpStatusCode: 200 } });
    expect(logAndPublishMetric).toHaveBeenCalledWith('PUBLISHED_EVENT_TO_TXMA');
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, sqsCommandInputForUserAction);
  });

  it('should successfully send the audit event and return a response when a suspend event is received', async () => {
    sqsMock.on(SendMessageCommand).resolves({ $metadata: { httpStatusCode: 200 } });
    const response = await sendAuditEvent(
      'AIS_EVENT_TRANSITION_APPLIED',
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      ingressInterventionEvent,
      {
        nextAllowableInterventions: ['01'],
        interventionName: AISInterventionTypes.AIS_ACCOUNT_SUSPENDED,
        stateResult: { blocked: false, suspended: true, reproveIdentity: false, resetPassword: false },
      },
    );
    expect(response).toEqual({ $metadata: { httpStatusCode: 200 } });
    expect(logAndPublishMetric).toHaveBeenCalledWith('PUBLISHED_EVENT_TO_TXMA');
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, sqsCommandInputForSuspendIntervention);
  });

  it('should successfully send the audit event and return a response when an block event is received', async () => {
    sqsMock.on(SendMessageCommand).resolves({ $metadata: { httpStatusCode: 200 } });
    const response = await sendAuditEvent(
      'AIS_EVENT_TRANSITION_APPLIED',
      EventsEnum.FRAUD_BLOCK_ACCOUNT,
      ingressInterventionEvent,
      {
        nextAllowableInterventions: [],
        interventionName: AISInterventionTypes.AIS_ACCOUNT_BLOCKED,
        stateResult: { blocked: true, suspended: false, reproveIdentity: false, resetPassword: false },
      },
    );
    expect(response).toEqual({ $metadata: { httpStatusCode: 200 } });
    expect(logAndPublishMetric).toHaveBeenCalledWith('PUBLISHED_EVENT_TO_TXMA');
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, sqsCommandInputForBlockIntervention);
  });

  it('if SQS call fails, it should log the error and return', async () => {
    sqsMock.on(SendMessageCommand).rejects('SomeSQSError');
    const response = await sendAuditEvent(
      'AIS_EVENT_TRANSITION_APPLIED',
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      ingressInterventionEvent,
      {
        nextAllowableInterventions: ['01'],
        interventionName: AISInterventionTypes.AIS_ACCOUNT_SUSPENDED,
        stateResult: { blocked: false, suspended: true, reproveIdentity: false, resetPassword: false },
      },
    );
    expect(response).toBeUndefined();
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, sqsCommandInputForSuspendIntervention);
    expect(logger.error).toHaveBeenCalledWith(
      'An error happened while trying to send the audit event to the TxMA queue.',
    );
    expect(logAndPublishMetric).toHaveBeenCalledWith('ERROR_PUBLISHING_EVENT_TO_TXMA');
  });

  it('should successfully send the audit event and return a response when an the account is marked as deleted', async () => {
    sqsMock.on(SendMessageCommand).resolves({ $metadata: { httpStatusCode: 200 } });
    const response = await sendAuditEvent(
      'AIS_EVENT_IGNORED_ACCOUNT_DELETED',
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      ingressInterventionEvent,
      {
        nextAllowableInterventions: [],
        interventionName: AISInterventionTypes.AIS_ACCOUNT_SUSPENDED,
        stateResult: { blocked: true, suspended: true, reproveIdentity: false, resetPassword: false },
      },
    );
    expect(response).toEqual({ $metadata: { httpStatusCode: 200 } });
    expect(logAndPublishMetric).toHaveBeenCalledWith('PUBLISHED_EVENT_TO_TXMA');
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, sqsCommandInputForDeletedAccount);
  });

  it('should successfully send the audit event and return a response when an the account is suspended without a user action', async () => {
    sqsMock.on(SendMessageCommand).resolves({ $metadata: { httpStatusCode: 200 } });
    const response = await sendAuditEvent(
      'AIS_EVENT_TRANSITION_APPLIED',
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      ingressInterventionEvent,
      {
        nextAllowableInterventions: ['01', '91'],
        interventionName: AISInterventionTypes.AIS_ACCOUNT_SUSPENDED,
        stateResult: { blocked: false, suspended: true, reproveIdentity: false, resetPassword: false },
      },
    );
    expect(response).toEqual({ $metadata: { httpStatusCode: 200 } });
    expect(logAndPublishMetric).toHaveBeenCalledWith('PUBLISHED_EVENT_TO_TXMA');
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, sqsCommandInputForSuspendIntervention);
  });

  it('should successfully send the audit event and return a response when an the account is suspended with a user action', async () => {
    sqsMock.on(SendMessageCommand).resolves({ $metadata: { httpStatusCode: 200 } });
    const response = await sendAuditEvent(
      'AIS_EVENT_TRANSITION_APPLIED',
      EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      ingressInterventionEvent,
      {
        nextAllowableInterventions: [],
        interventionName: AISInterventionTypes.AIS_FORCED_USER_IDENTITY_VERIFY,
        stateResult: { blocked: false, suspended: true, reproveIdentity: true, resetPassword: false },
      },
    );
    expect(response).toEqual({ $metadata: { httpStatusCode: 200 } });
    expect(logAndPublishMetric).toHaveBeenCalledWith('PUBLISHED_EVENT_TO_TXMA');
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, sqsCommandInputForSuspendUserAction);
  });

  it('should successfully send the audit event and return a response when an the account is suspended with a user action (reprove identity and reset pass)', async () => {
    sqsMock.on(SendMessageCommand).resolves({ $metadata: { httpStatusCode: 200 } });
    const response = await sendAuditEvent(
      'AIS_EVENT_TRANSITION_APPLIED',
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
      ingressInterventionEvent,
      {
        nextAllowableInterventions: [],
        interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY,
        stateResult: { blocked: false, suspended: true, reproveIdentity: true, resetPassword: true },
      },
    );
    expect(response).toEqual({ $metadata: { httpStatusCode: 200 } });
    expect(logAndPublishMetric).toHaveBeenCalledWith('PUBLISHED_EVENT_TO_TXMA');
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(
      SendMessageCommand,
      sqsCommandInputForSuspendUserActionReproveIdentityAndResetPass,
    );
  });

  it('should successfully send the audit event with any extra fields from the intervention event', async () => {
    sqsMock.on(SendMessageCommand).resolves({ $metadata: { httpStatusCode: 200 } });

    const response = await sendAuditEvent(
      'AIS_EVENT_TRANSITION_APPLIED',
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
      ingressEventWithExtraInterventionData,
      {
        nextAllowableInterventions: [],
        interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY,
        stateResult: { blocked: false, suspended: true, reproveIdentity: true, resetPassword: true },
      },
    );
    expect(response).toEqual({ $metadata: { httpStatusCode: 200 } });
    expect(logAndPublishMetric).toHaveBeenCalledWith('PUBLISHED_EVENT_TO_TXMA');
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(
      SendMessageCommand,
      sqsInputWithExtraFields,
    );
  });

  it('should successfully send the audit event with any extra fields from the intervention event when there is no state engine output', async () => {
    sqsMock.on(SendMessageCommand).resolves({ $metadata: { httpStatusCode: 200 } });
    const sqsCommandInput = {
      QueueUrl: AppConfigService.getInstance().txmaEgressQueueUrl,
      MessageBody: JSON.stringify({
        timestamp: 1_234_567,
        event_timestamp_ms: 1_234_567_890,
        event_timestamp_ms_formatted: 'today',
        component_id: COMPONENT_ID,
        event_name: 'AIS_EVENT_TRANSITION_APPLIED',
        user: { user_id: 'testUserId' },
        extensions: {
          trigger_event: 'TICF_ACCOUNT_INTERVENTION',
          trigger_event_id: '123',
          intervention_code: '01',
          intervention_reason: 'reason',
          123: 'this is an extra field',
          another_extra_field: 'extra data',
        },
      }),

    }
    const response = await sendAuditEvent(
      'AIS_EVENT_TRANSITION_APPLIED',
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
      ingressEventWithExtraInterventionData
    );
    expect(response).toEqual({ $metadata: { httpStatusCode: 200 } });
    expect(logAndPublishMetric).toHaveBeenCalledWith('PUBLISHED_EVENT_TO_TXMA');
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(
      SendMessageCommand, sqsCommandInput,
    );
  });

  it('should successfully send the audit event and return a response when an the account is unsuspended', async () => {
    sqsMock.on(SendMessageCommand).resolves({ $metadata: { httpStatusCode: 200 } });
    const response = await sendAuditEvent(
      'AIS_EVENT_TRANSITION_APPLIED',
      EventsEnum.FRAUD_UNSUSPEND_ACCOUNT,
      ingressInterventionEvent,
      {
        nextAllowableInterventions: ['01'],
        interventionName: AISInterventionTypes.AIS_ACCOUNT_UNSUSPENDED,
        stateResult: { blocked: false, suspended: false, reproveIdentity: false, resetPassword: false },
      },
    );
    expect(response).toEqual({ $metadata: { httpStatusCode: 200 } });
    expect(logAndPublishMetric).toHaveBeenCalledWith('PUBLISHED_EVENT_TO_TXMA');
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, sqsCommandInputForUnsuspendIntervention);
  });

  it('should successfully send the audit event and return a response when the event is in the future', async () => {
    sqsMock.on(SendMessageCommand).resolves({ $metadata: { httpStatusCode: 200 } });
    const response = await sendAuditEvent(
      'AIS_EVENT_IGNORED_IN_FUTURE',
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      ingressInterventionEvent,
    );
    expect(response).toEqual({ $metadata: { httpStatusCode: 200 } });
    expect(logAndPublishMetric).toHaveBeenCalledWith('PUBLISHED_EVENT_TO_TXMA');
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, sqsCommandInputForFutureInterventions);
  });

  it('should not send an audit event when the outgoing message is notifying that a user led action was ignored on a non-intervention account', async () => {
    //sqsMock.reset();
    const response = await sendAuditEvent(
      'AIS_EVENT_TRANSITION_IGNORED',
      EventsEnum.IPV_IDENTITY_ISSUED,
      ingressUserActionEvent,
      {
        stateResult: {
          blocked: false,
          suspended: false,
          resetPassword: false,
          reproveIdentity: false,
        },
        nextAllowableInterventions: [],
      },
    );
    expect(response).toBeUndefined();
    expect(logAndPublishMetric).not.toHaveBeenCalled();
    expect(sqsMock).not.toHaveReceivedCommand(SendMessageCommand);
  });
});
