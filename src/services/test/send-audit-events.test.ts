import {SendMessageCommand, SQSClient} from '@aws-sdk/client-sqs';
import {mockClient} from 'aws-sdk-client-mock';
import {sendAuditEvent} from '../send-audit-events';
import {COMPONENT_ID, EventsEnum, TICF_ACCOUNT_INTERVENTION} from '../../data-types/constants';
import {logAndPublishMetric} from '../../commons/metrics';
import logger from '../../commons/logger';
import {AppConfigService} from '../app-config-service';
import {getCurrentTimestamp} from '../../commons/get-current-timestamp';
import 'aws-sdk-client-mock-jest';
import {TxMAIngressEvent} from "../../data-types/interfaces";

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

const ingressEvent: TxMAIngressEvent = {
  component_id: "",
  timestamp: 5,
  event_timestamp_ms: 5000,
  user: {
    user_id: 'abc',
  },
  event_name: TICF_ACCOUNT_INTERVENTION,
  extensions: {
    intervention: {
      intervention_code: '01',
      intervention_reason: 'reason',
    },
  }
};
const sqsMock = mockClient(SQSClient);
const sqsCommandInput = {
  QueueUrl: AppConfigService.getInstance().txmaEgressQueueUrl,
  MessageBody: JSON.stringify({
    timestamp: 1_234_567,
    event_timestamp_ms: 1_234_567_890,
    event_timestamp_ms_formatted: 'today',
    component_id: COMPONENT_ID,
    event_name: 'AIS_INTERVENTION_TRANSITION_APPLIED',
    user: { user_id: 'testUserId' },
    extensions: {
      intervention: EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      appliedAt: 123_456,
    },
  }),
};
describe('send-audit-events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully send the audit event and return a response', async () => {
    sqsMock.on(SendMessageCommand).resolves({ $metadata: { httpStatusCode: 200 } });
    const response = await sendAuditEvent('AIS_INTERVENTION_TRANSITION_APPLIED', EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, ingressEvent);
    expect(response).toEqual({ $metadata: { httpStatusCode: 200 } });
    expect(logAndPublishMetric).toHaveBeenCalledWith('PUBLISHED_EVENT_TO_TXMA');
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, sqsCommandInput);
  });
  it('if SQS call fails, it should log the error and return', async () => {
    sqsMock.on(SendMessageCommand).rejects('SomeSQSError');
    const response = await sendAuditEvent('AIS_INTERVENTION_TRANSITION_APPLIED', EventsEnum.IPV_IDENTITY_ISSUED, ingressEvent);
    expect(response).toBeUndefined();
    expect(getCurrentTimestamp).toHaveBeenCalledTimes(1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, sqsCommandInput);
    expect(logger.error).toHaveBeenCalledWith(
      'An error happened while trying to send the audit event to the TxMA queue.',
    );
    expect(logAndPublishMetric).toHaveBeenCalledWith('ERROR_PUBLISHING_EVENT_TO_TXMA');
  });
});
