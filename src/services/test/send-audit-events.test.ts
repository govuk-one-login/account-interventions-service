import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';
import { sendAuditEvent } from '../send-audit-events';
import { COMPONENT_ID, EventsEnum, TICF_ACCOUNT_INTERVENTION } from '../../data-types/constants';
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
  event_name: TICF_ACCOUNT_INTERVENTION,
  extensions: {
    intervention: {
      intervention_code: '01',
      intervention_reason: 'reason',
    },
  },
};

const ingressUserActionEvent = {
  event_name: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
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
    component_id: COMPONENT_ID,
    event_name: 'AIS_EVENT_TRANSITION_APPLIED',
    user: { user_id: 'testUserId' },
    extensions: {
      eventType: 'USER_LED_ACTION',
      event: EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
      appliedAt: 1_234_567,
    },
  }),
};

const sqsCommandInputForIntervention = {
  QueueUrl: AppConfigService.getInstance().txmaEgressQueueUrl,
  MessageBody: JSON.stringify({
    timestamp: 1_234_567,
    event_timestamp_ms: 1_234_567_890,
    event_timestamp_ms_formatted: 'today',
    component_id: COMPONENT_ID,
    event_name: 'AIS_EVENT_TRANSITION_APPLIED',
    user: { user_id: 'testUserId' },
    extensions: {
      eventType: 'TICF_ACCOUNT_INTERVENTION',
      event: EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      intervention_code: '01',
      reason: 'reason',
      appliedAt: 1_234_567,
    },
  }),
};
describe('send-audit-events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully send the audit event and return a response when a user action event is received', async () => {
    sqsMock.on(SendMessageCommand).resolves({ $metadata: { httpStatusCode: 200 } });
    const response = await sendAuditEvent(
      'AIS_EVENT_TRANSITION_APPLIED',
      EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
      ingressUserActionEvent,
      1_234_567,
    );
    expect(response).toEqual({ $metadata: { httpStatusCode: 200 } });
    expect(logAndPublishMetric).toHaveBeenCalledWith('PUBLISHED_EVENT_TO_TXMA');
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, sqsCommandInputForUserAction);
  });

  it('should successfully send the audit event and return a response when an intervention event is received', async () => {
    sqsMock.on(SendMessageCommand).resolves({ $metadata: { httpStatusCode: 200 } });
    const response = await sendAuditEvent(
      'AIS_EVENT_TRANSITION_APPLIED',
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      ingressInterventionEvent,
      1_234_567,
    );
    expect(response).toEqual({ $metadata: { httpStatusCode: 200 } });
    expect(logAndPublishMetric).toHaveBeenCalledWith('PUBLISHED_EVENT_TO_TXMA');
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, sqsCommandInputForIntervention);
  });

  it('if SQS call fails, it should log the error and return', async () => {
    sqsMock.on(SendMessageCommand).rejects('SomeSQSError');
    const response = await sendAuditEvent(
      'AIS_EVENT_TRANSITION_APPLIED',
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      ingressInterventionEvent,
      1_234_567,
    );
    expect(response).toBeUndefined();
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, sqsCommandInputForIntervention);
    expect(logger.error).toHaveBeenCalledWith(
      'An error happened while trying to send the audit event to the TxMA queue.',
    );
    expect(logAndPublishMetric).toHaveBeenCalledWith('ERROR_PUBLISHING_EVENT_TO_TXMA');
  });
});
