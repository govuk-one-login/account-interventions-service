import { handler } from '../interventions-processor-handler';
import { ContextExamples } from '@aws-lambda-powertools/commons';
import logger from '../../commons/logger';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { addMetric } from '../../commons/metrics';
import { DynamoDatabaseService } from '../../services/dynamo-database-service';
import * as validationModule from '../../services/validate-event';
import { AccountStateEngine } from '../../services/account-states/account-state-engine';
import { getCurrentTimestamp } from '../../commons/get-current-timestamp';
import { StateTransitionError, TooManyRecordsError, ValidationError } from '../../data-types/errors';
import { AISInterventionTypes, EventsEnum, MetricNames, TriggerEventsEnum } from '../../data-types/constants';
import { TxMAEgressEventTransitionType, TxMAIngressEvent } from '../../data-types/interfaces';
import { publishTimeToResolveMetrics } from '../../commons/metrics-helper';
import { AuditEvents} from '../../services/audit-events-service';

jest.mock('@aws-lambda-powertools/logger');
jest.mock('../../commons/metrics');
jest.mock('@aws-sdk/util-dynamodb');
jest.mock('../../services/dynamo-database-service');
jest.mock('../../commons/metrics-helper');
jest.mock('../../services/audit-events-service');

jest.mock('../../commons/get-current-timestamp', () => ({
  getCurrentTimestamp: jest.fn().mockImplementation(() => {
    return {
      milliseconds: 1_234_567_890,
      isoString: 'today',
      seconds: 1_234_567,
    };
  }),
}));

const now = getCurrentTimestamp();
const t0ms = now.milliseconds;
const t0s = now.seconds;

const interventionEventBody: TxMAIngressEvent = {
  component_id: '',
  timestamp: t0s - 5,
  event_timestamp_ms: t0ms - 5000,
  user: {
    user_id: 'abc',
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

const operationalEventBody: TxMAIngressEvent = {
  component_id: '',
  timestamp: t0s - 5,
  event_timestamp_ms: t0ms - 5000,
  user: {
    user_id: 'abc',
  },
  event_name: TriggerEventsEnum.OPERATIONAL_ACCOUNT_INTERVENTION,
  event_id: '123',
  extensions: {
    intervention: {
      intervention_code: '25',
      intervention_reason: 'reason',
    },
  },
};

const interventionEventBodyInTheFuture = {
  component_id: '',
  timestamp: getCurrentTimestamp().seconds + 5,
  event_timestamp_ms: getCurrentTimestamp().milliseconds + 5000,
  user: {
    user_id: 'abc',
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

const resetPasswordEventBody = {
  event_name: TriggerEventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
  event_id: '123',
  timestamp: t0s - 5,
  event_timestamp_ms: t0ms - 5000,
  client_id: 'UNKNOWN',
  component_id: 'UNKNOWN',
  user: {
    user_id: 'abc',
    email: '',
    phone: 'UNKNOWN',
    ip_address: '',
    session_id: '',
    persistent_session_id: '',
    govuk_signin_journey_id: '',
  },
};

const mockRetrieveRecords = DynamoDatabaseService.prototype.getAccountStateInformation as jest.Mock;
const mockUpdateRecords = DynamoDatabaseService.prototype.updateUserStatus as jest.Mock;
const mockValidateEventAgainstSchema = jest.spyOn(validationModule, 'validateEventAgainstSchema').mockReturnValue();

const accountStateEngine = AccountStateEngine.getInstance();
accountStateEngine.getInterventionEnumFromCode = jest.fn().mockImplementation(() => {
  return EventsEnum.FRAUD_BLOCK_ACCOUNT;
});
describe('intervention processor handler', () => {
  let mockEvent: SQSEvent;
  let mockRecord: SQSRecord;
  const mockContext = ContextExamples.helloworldContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecord = {
      messageId: '123',
      receiptHandle: '',
      body: JSON.stringify(interventionEventBody),
      attributes: {
        ApproximateReceiveCount: '',
        SentTimestamp: '',
        SenderId: '',
        ApproximateFirstReceiveTimestamp: '',
      },
      messageAttributes: {},
      md5OfBody: '',
      eventSource: '',
      eventSourceARN: '',
      awsRegion: '',
    };
    mockEvent = { Records: [mockRecord] };
    mockRetrieveRecords.mockReturnValue({
      blocked: false,
      reproveIdentity: false,
      resetPassword: false,
      suspended: false,
    });
    mockUpdateRecords.mockReturnValue({
      $metadata: {
        httpStatusCode: 200,
      },
    });
  });

  describe('handle', () => {
    it('does nothing if SQS event contains no record', async () => {
      const loggerWarnSpy = jest.spyOn(logger, 'warn');
      await handler({ Records: [] }, mockContext);
      expect(loggerWarnSpy).toHaveBeenCalledWith('Received no records.');
      expect(addMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should not retry if message body cannot be parsed to valid JSON', async () => {
      mockRecord.body = ' ';
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(logger.error).toHaveBeenCalledWith('Sensitive info - record body could not be parsed to valid JSON.', {
        error: new SyntaxError('Unexpected end of JSON input'),
      });
      expect(addMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
    });
    it('should not retry the record if a StateTransitionError is received', async () => {
      mockRetrieveRecords.mockReturnValue({
        blocked: false,
        reproveIdentity: false,
        resetPassword: false,
        suspended: false,
      });
      accountStateEngine.applyEventTransition = jest.fn().mockImplementationOnce(() => {
        throw new StateTransitionError('State transition Error', EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET, {
          nextAllowableInterventions: [],
          stateResult: {
            blocked: false,
            suspended: false,
            resetPassword: false,
            reproveIdentity: false,
          },
          interventionName: AISInterventionTypes.AIS_NO_INTERVENTION,
        });
      });
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(logger.warn).toHaveBeenCalledWith('StateTransitionError caught, message will not be retried.', {
        errorMessage: 'State transition Error',
      });
      expect(AuditEvents).toHaveBeenLastCalledWith(
        TxMAEgressEventTransitionType.TRANSITION_IGNORED,
        EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
        interventionEventBody,
        {
          stateResult: {
            blocked: false,
            reproveIdentity: false,
            resetPassword: false,
            suspended: false,
          },
          interventionName: 'AIS_NO_INTERVENTION',
          nextAllowableInterventions: [],
        },
      );
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should succeed when a valid intervention event is received', async () => {
      accountStateEngine.applyEventTransition = jest.fn().mockReturnValueOnce({
        stateResult: {
          blocked: false,
          suspended: true,
          resetPassword: false,
          reproveIdentity: false,
        },
        interventionName: EventsEnum.FRAUD_BLOCK_ACCOUNT,
        nextAllowableInterventions: [],
      });
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(AuditEvents).toHaveBeenLastCalledWith(
        TxMAEgressEventTransitionType.TRANSITION_APPLIED,
        EventsEnum.FRAUD_BLOCK_ACCOUNT,
        interventionEventBody,
        {
          stateResult: {
            blocked: false,
            reproveIdentity: false,
            resetPassword: false,
            suspended: true,
          },
          interventionName: 'FRAUD_BLOCK_ACCOUNT',
          nextAllowableInterventions: [],
        },
      );
      expect(addMetric).toHaveBeenCalledWith(MetricNames.EVENT_DELIVERY_LATENCY, [], 5000);
      expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_APPLIED, [], 1, {
        eventName: 'FRAUD_BLOCK_ACCOUNT',
      });
      expect(publishTimeToResolveMetrics).toHaveBeenCalledTimes(1);
    });

    it('should succeed when an intervention event is received for a non existing user', async () => {
      mockRetrieveRecords.mockReturnValue(undefined);
      accountStateEngine.applyEventTransition = jest.fn().mockReturnValueOnce({
        stateResult: {
          blocked: false,
          suspended: true,
          resetPassword: false,
          reproveIdentity: false,
        },
        interventionName: EventsEnum.FRAUD_BLOCK_ACCOUNT,
        nextAllowableInterventions: [],
      });
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(AuditEvents).toHaveBeenLastCalledWith(
        TxMAEgressEventTransitionType.TRANSITION_APPLIED,
        EventsEnum.FRAUD_BLOCK_ACCOUNT,
        interventionEventBody,
        {
          stateResult: {
            blocked: false,
            reproveIdentity: false,
            resetPassword: false,
            suspended: true,
          },
          interventionName: 'FRAUD_BLOCK_ACCOUNT',
          nextAllowableInterventions: [],
        },
      );
      expect(addMetric).toHaveBeenCalledWith(MetricNames.EVENT_DELIVERY_LATENCY, [], 5000);
      expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_APPLIED, [], 1, {
        eventName: 'FRAUD_BLOCK_ACCOUNT',
      });
      expect(publishTimeToResolveMetrics).toHaveBeenCalledTimes(1);
    });

    it('should succeed when a valid user action event is received', async () => {
      accountStateEngine.applyEventTransition = jest.fn().mockReturnValueOnce({
        stateResult: {
          blocked: false,
          suspended: false,
          resetPassword: false,
          reproveIdentity: false,
        },
        interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET,
        nextAllowableInterventions: [],
      });
      mockRecord.body = JSON.stringify(resetPasswordEventBody);
      mockEvent.Records = [mockRecord];
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(AuditEvents).toHaveBeenLastCalledWith(
        TxMAEgressEventTransitionType.TRANSITION_APPLIED,
        EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
        resetPasswordEventBody,
        {
          stateResult: {
            blocked: false,
            reproveIdentity: false,
            resetPassword: false,
            suspended: false,
          },
          interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET,
          nextAllowableInterventions: [],
        },
      );

      expect(addMetric).toHaveBeenCalledWith(MetricNames.EVENT_DELIVERY_LATENCY, [], 5000);
      expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_APPLIED, [], 1, {
        eventName: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
      });
      expect(publishTimeToResolveMetrics).toHaveBeenCalledTimes(1);
    });

    it('should not process the event if the user account is marked as deleted', async () => {
      mockRetrieveRecords.mockReturnValue({
        blocked: false,
        reproveIdentity: false,
        resetPassword: false,
        suspended: false,
        isAccountDeleted: true,
      });
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(addMetric).toHaveBeenLastCalledWith(MetricNames.ACCOUNT_IS_MARKED_AS_DELETED);
      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect((logger.warn as jest.Mock).mock.calls).toEqual([
        ['Sensitive info - user abc account has been deleted.'],
        ['ValidationError caught, message will not be retried.', { errorMessage: 'Account is marked as deleted.' }],
      ]);
      expect(AuditEvents).toHaveBeenLastCalledWith(
        TxMAEgressEventTransitionType.IGNORED_ACCOUNT_DELETED,
        EventsEnum.FRAUD_BLOCK_ACCOUNT,
        interventionEventBody,
        {
          stateResult: {
            blocked: false,
            reproveIdentity: false,
            resetPassword: false,
            suspended: false,
          },
          interventionName: 'AIS_NO_INTERVENTION',
          nextAllowableInterventions: ['01', '03', '04', '05', '06', '25'],
        },
      );
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should return message id to be retried if event is in the future', async () => {
      mockRecord.body = JSON.stringify(interventionEventBodyInTheFuture);
      expect(await handler({ Records: [mockRecord] }, mockContext)).toEqual({
        batchItemFailures: [
          {
            itemIdentifier: '123',
          },
        ],
      });
      expect(addMetric).toHaveBeenCalledWith('INTERVENTION_IGNORED_IN_FUTURE');
      expect(AuditEvents).toHaveBeenLastCalledWith(
        TxMAEgressEventTransitionType.IGNORED_IN_FUTURE,
        EventsEnum.FRAUD_BLOCK_ACCOUNT,
        interventionEventBodyInTheFuture,
      );
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should ignore the event if body is invalid', async () => {
      mockValidateEventAgainstSchema.mockImplementationOnce(() => {
        throw new ValidationError('invalid event');
      });
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should return message id to be retried if dynamo db operation fails', async () => {
      mockRetrieveRecords.mockRejectedValueOnce('Error');
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [
          {
            itemIdentifier: '123',
          },
        ],
      });
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should not process the event and return if the event timestamp predates the latest applied intervention for the user ', async () => {
      mockRetrieveRecords.mockReturnValueOnce({
        blocked: false,
        reproveIdentity: false,
        resetPassword: false,
        suspended: false,
        isAccountDeleted: false,
        appliedAt: t0ms + 10,
        sentAt: t0ms + 10_000,
      });
      expect(await handler({ Records: [mockRecord] }, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(logger.warn).toHaveBeenCalledWith('Event received predates last applied event for this user.');
      expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_STALE);
      expect(AuditEvents).toHaveBeenCalledWith(
        TxMAEgressEventTransitionType.IGNORED_STALE,
        EventsEnum.FRAUD_BLOCK_ACCOUNT,
        interventionEventBody,
        {
          stateResult: {
            blocked: false,
            reproveIdentity: false,
            resetPassword: false,
            suspended: false,
          },
          interventionName: 'AIS_NO_INTERVENTION',
          nextAllowableInterventions: ['01', '03', '04', '05', '06', '25'],
        },
      );
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should successfully process valid event from fraud', async () => {
      mockRetrieveRecords.mockReturnValue({
        blocked: false,
        reproveIdentity: false,
        resetPassword: false,
        suspended: false,
        isAccountDeleted: false,
      });
      mockRecord = {
        messageId: '123',
        receiptHandle: '',
        body: JSON.stringify({
          timestamp: t0s,
          user: {
            user_id: 'abc',
          },
          event_name: 'TICF_ACCOUNT_INTERVENTION',
          extensions: {
            intervention: {
              intervention_code: '01',
              intervention_reason: 'reason',
            },
          },
        }),
        attributes: {
          ApproximateReceiveCount: '',
          SentTimestamp: '',
          SenderId: '',
          ApproximateFirstReceiveTimestamp: '',
        },
        messageAttributes: {},
        md5OfBody: '',
        eventSource: '',
        eventSourceARN: '',
        awsRegion: '',
      };
      accountStateEngine.applyEventTransition = jest.fn().mockReturnValueOnce({
        stateResult: {
          blocked: false,
          suspended: false,
          resetPassword: false,
          reproveIdentity: false,
        },
        interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET,
        nextAllowableInterventions: [],
      });
      expect(await handler({ Records: [mockRecord] }, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(publishTimeToResolveMetrics).toHaveBeenCalledTimes(1);
    });

    it('should not retry if too many items are returned', async () => {
      mockRetrieveRecords.mockRejectedValueOnce(new TooManyRecordsError('Too many records'));
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Too many records were returned from the database. Message will not be retried',
        { errorMessage: 'Too many records' },
      );
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should ignore if level of confidence is not P2 for an ID Reset user action event', async () => {
      mockRecord = {
        messageId: '123',
        receiptHandle: '',
        body: JSON.stringify({
          timestamp: getCurrentTimestamp().milliseconds + 500_000,
          user: {
            user_id: 'abc',
          },
          event_name: 'IPV_IDENTITY_ISSUED',
          extensions: {
            levelOfConfidence: 'P1',
            ciFail: false,
            hasMitigations: false,
          },
        }),
        attributes: {
          ApproximateReceiveCount: '',
          SentTimestamp: '',
          SenderId: '',
          ApproximateFirstReceiveTimestamp: '',
        },
        messageAttributes: {},
        md5OfBody: '',
        eventSource: '',
        eventSourceARN: '',
        awsRegion: '',
      };
      expect(await handler({ Records: [mockRecord] }, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(addMetric).toHaveBeenCalledWith('CONFIDENCE_LEVEL_TOO_LOW');
      expect(logger.warn).toHaveBeenCalledWith('Received interventions has low level of confidence: P1');
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should succeed when a valid operational event is received', async () => {
      mockRecord.body = JSON.stringify(operationalEventBody);
      accountStateEngine.getInterventionEnumFromCode = jest.fn().mockImplementationOnce(() => {
        return EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION;
      });
      accountStateEngine.applyEventTransition = jest.fn().mockReturnValueOnce({
        stateResult: {
          blocked: false,
          suspended: true,
          resetPassword: false,
          reproveIdentity: true,
        },
        interventionName: EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION,
        nextAllowableInterventions: ['01', '02', '03', '04', '06', '91'],
      });
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(AuditEvents).toHaveBeenLastCalledWith(
        TxMAEgressEventTransitionType.TRANSITION_APPLIED,
        EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION,
        operationalEventBody,
        {
          stateResult: {
            blocked: false,
            reproveIdentity: true,
            resetPassword: false,
            suspended: true,
          },
          interventionName: 'OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION',
          nextAllowableInterventions: ['01', '02', '03', '04', '06', '91'],
        },
      );
      expect(addMetric).toHaveBeenCalledWith(MetricNames.EVENT_DELIVERY_LATENCY, [], 5000);
      expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_APPLIED, [], 1, {
        eventName: 'OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION',
      });
      expect(publishTimeToResolveMetrics).toHaveBeenCalledTimes(1);
    });

    it('should not retry the record if a StateTransitionError is received when operational event is received', async () => {
      mockRecord.body = JSON.stringify(operationalEventBody);
      mockRetrieveRecords.mockReturnValue({
        blocked: false,
        reproveIdentity: false,
        resetPassword: false,
        suspended: false,
      });
      accountStateEngine.applyEventTransition = jest.fn().mockImplementationOnce(() => {
        throw new StateTransitionError('State transition Error', EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION, {
          nextAllowableInterventions: [],
          stateResult: {
            blocked: false,
            suspended: false,
            resetPassword: false,
            reproveIdentity: false,
          },
          interventionName: AISInterventionTypes.AIS_NO_INTERVENTION,
        });
      });
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(logger.warn).toHaveBeenCalledWith('StateTransitionError caught, message will not be retried.', {
        errorMessage: 'State transition Error',
      });
      expect(AuditEvents).toHaveBeenLastCalledWith(
        TxMAEgressEventTransitionType.TRANSITION_IGNORED,
        EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION,
        operationalEventBody,
        {
          stateResult: {
            blocked: false,
            reproveIdentity: false,
            resetPassword: false,
            suspended: false,
          },
          interventionName: 'AIS_NO_INTERVENTION',
          nextAllowableInterventions: [],
        },
      );
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should not process the event if the user account is marked as deleted when operational event is received', async () => {
      mockRecord.body = JSON.stringify(operationalEventBody);
      accountStateEngine.getInterventionEnumFromCode = jest.fn().mockImplementationOnce(() => {
        return EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION;
      });
      mockRetrieveRecords.mockReturnValue({
        blocked: false,
        reproveIdentity: false,
        resetPassword: false,
        suspended: false,
        isAccountDeleted: true,
      });
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(addMetric).toHaveBeenLastCalledWith(MetricNames.ACCOUNT_IS_MARKED_AS_DELETED);
      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect((logger.warn as jest.Mock).mock.calls).toEqual([
        ['Sensitive info - user abc account has been deleted.'],
        ['ValidationError caught, message will not be retried.', { errorMessage: 'Account is marked as deleted.' }],
      ]);
      expect(AuditEvents).toHaveBeenLastCalledWith(
        TxMAEgressEventTransitionType.IGNORED_ACCOUNT_DELETED,
        EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION,
        operationalEventBody,
        {
          stateResult: {
            blocked: false,
            reproveIdentity: false,
            resetPassword: false,
            suspended: false,
          },
          interventionName: 'AIS_NO_INTERVENTION',
          nextAllowableInterventions: ['01', '03', '04', '05', '06', '25'],
        },
      );
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });
  });
});
