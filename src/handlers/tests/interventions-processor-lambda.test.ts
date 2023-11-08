import {handler} from '../interventions-processor-handler';
import {ContextExamples} from '@aws-lambda-powertools/commons';
import logger from '../../commons/logger';
import type {SQSEvent, SQSRecord} from 'aws-lambda';
import {logAndPublishMetric} from '../../commons/metrics';
import {DynamoDatabaseService} from '../../services/dynamo-database-service';
import {validateEvent, validateInterventionEvent} from '../../services/validate-event';
import {AccountStateEngine,} from '../../services/account-states/account-state-engine';
import {getCurrentTimestamp} from '../../commons/get-current-timestamp';
import {StateTransitionError, TooManyRecordsError, ValidationError} from '../../data-types/errors';
import {EventsEnum, MetricNames, TICF_ACCOUNT_INTERVENTION} from "../../data-types/constants";
import {sendAuditEvent} from "../../services/send-audit-events";

jest.mock('@aws-lambda-powertools/logger');
jest.mock('../../commons/metrics');
jest.mock('@aws-sdk/util-dynamodb');
jest.mock('../../services/dynamo-database-service');
jest.mock('../../services/validate-event');
jest.mock('../../services/send-audit-events');

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

const interventionEventBody = {
  timestamp: t0s - 5,
  event_timestamp_ms: t0ms - 5000,
  user: {
    user_id: 'abc',
  },
  event_name: TICF_ACCOUNT_INTERVENTION,
  extension: {
    intervention: {
      intervention_code: '01',
      intervention_reason: 'reason',
    },
  },
}

const interventionEventBodyInTheFuture = {
  timestamp: getCurrentTimestamp().seconds + 5,
  event_timestamp_ms: getCurrentTimestamp().milliseconds + 5000,
  user: {
    user_id: 'abc',
  },
  event_name: TICF_ACCOUNT_INTERVENTION,
  extension: {
    intervention: {
      intervention_code: '01',
      intervention_reason: 'reason',
    },
  },
}

const resetPasswordEventBody = {
  "event_name": "AUTH_PASSWORD_RESET_SUCCESSFUL",
  "timestamp": t0s,
  "client_id": "UNKNOWN",
  "component_id": "UNKNOWN",
  "user": {
    "user_id": "abc",
    "email": "",
    "phone": "UNKNOWN",
    "ip_address": "",
    "session_id": "",
    "persistent_session_id": "",
    "govuk_signin_journey_id": ""
  }
}

const mockRetrieveRecords = DynamoDatabaseService.prototype.retrieveRecordsByUserId as jest.Mock;
const mockUpdateRecords = DynamoDatabaseService.prototype.updateUserStatus as jest.Mock;
const eventValidationMock = validateEvent as jest.Mock;
const interventionEventValidationMock = validateInterventionEvent as jest.Mock;
const accountStateEngine = AccountStateEngine.getInstance();
accountStateEngine.getInterventionEnumFromCode = jest.fn().mockImplementation(() => { return EventsEnum.FRAUD_BLOCK_ACCOUNT });
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
      expect(logAndPublishMetric).toHaveBeenCalledWith('INTERVENTION_EVENT_INVALID');
    });

    it('it should not retry the record if a StateTransitionError is received', async () => {
      eventValidationMock.mockReturnValueOnce(undefined);
      mockRetrieveRecords.mockReturnValue({
        blocked: false,
        reproveIdentity: false,
        resetPassword: false,
        suspended: false,
      });
      accountStateEngine.applyEventTransition = jest.fn().mockImplementationOnce(() => {
        throw new StateTransitionError('State transition Error', EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET);
      });
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(logger.warn).toHaveBeenCalledWith('StateTransitionError caught, message will not be retried.');
      expect(sendAuditEvent).toHaveBeenLastCalledWith('AIS_INTERVENTION_TRANSITION_IGNORED', 'abc', {
        intervention: EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
        reason: 'State transition Error'
      })
    });

    it('should succeed when an intervention event is received', async () => {
      eventValidationMock.mockReturnValueOnce(undefined);
      accountStateEngine.applyEventTransition = jest.fn().mockReturnValueOnce({
        newState: {
          blocked: false,
          suspended: true,
          resetPassword: false,
          reproveIdentity: false,
        },
        interventionName: EventsEnum.FRAUD_BLOCK_ACCOUNT
      });
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(sendAuditEvent).toHaveBeenLastCalledWith('AIS_INTERVENTION_TRANSITION_APPLIED', 'abc', {
        intervention: EventsEnum.FRAUD_BLOCK_ACCOUNT,
        appliedAt: 1_234_567_890
      })
    });

    it('should succeed when an user action event is received', async () => {
      eventValidationMock.mockReturnValueOnce(undefined);
      accountStateEngine.applyEventTransition = jest.fn().mockReturnValueOnce({
        newState: {
          blocked: false,
          suspended: false,
          resetPassword: false,
          reproveIdentity: false,
        },
      });
      mockRecord.body = JSON.stringify(resetPasswordEventBody);
      mockEvent.Records = [mockRecord];
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(sendAuditEvent).toHaveBeenLastCalledWith('AIS_INTERVENTION_TRANSITION_APPLIED', 'abc', {
        intervention: EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
        appliedAt: 1_234_567_890
      })
    });

    it('should not process the event if the user account is marked as deleted', async () => {
      eventValidationMock.mockReturnValueOnce(undefined);
      mockRetrieveRecords.mockReturnValue({
        blocked: false,
        reproveIdentity: false,
        resetPassword: false,
        suspended: false,
        isAccountDeleted: true
      });
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(logAndPublishMetric).toHaveBeenLastCalledWith(MetricNames.ACCOUNT_IS_MARKED_AS_DELETED);
      expect(logger.warn).toHaveBeenLastCalledWith('Sensitive info - user abc account has been deleted.');
      expect(sendAuditEvent).toHaveBeenLastCalledWith('AIS_INTERVENTION_IGNORED_ACCOUNT_DELETED', 'abc', {
        intervention: EventsEnum.FRAUD_BLOCK_ACCOUNT,
        reason: 'Target user account is marked as deleted.'
      })
    });

    it('should fail as timestamp is in the future', async () => {
      eventValidationMock.mockReturnValueOnce(undefined);
      mockRecord.body = JSON.stringify(interventionEventBodyInTheFuture);
      expect(await handler({ Records: [mockRecord] }, mockContext)).toEqual({
        batchItemFailures: [
          {
            itemIdentifier: '123',
          },
        ],
      });
      expect(logAndPublishMetric).toHaveBeenCalledWith('INTERVENTION_IGNORED_IN_FUTURE');
      expect(sendAuditEvent).toHaveBeenLastCalledWith('AIS_INTERVENTION_IGNORED_INFUTURE', 'abc', {
        intervention: EventsEnum.FRAUD_BLOCK_ACCOUNT,
        reason: 'received event is in the future'
      })
    });

    it('should ignore the event if body is invalid', async () => {
      eventValidationMock.mockImplementationOnce(() => {
        throw new ValidationError('invalid event');
      });
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
    });

    it('should fail if dynamo operation errors', async () => {
      eventValidationMock.mockReturnValueOnce(void 0);
      mockRetrieveRecords.mockRejectedValueOnce('Error');
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [
          {
            itemIdentifier: '123',
          },
        ],
      });
    });

    it('should not process the event and return if the event timestamp pre-dates the latest applied intervention for the user ', async () => {
      eventValidationMock.mockReturnValueOnce(undefined);
      interventionEventValidationMock.mockReturnValue(void 0);
      mockRetrieveRecords.mockReturnValue({
        blocked: false,
        reproveIdentity: false,
        resetPassword: false,
        suspended: false,
        isAccountDeleted: false,
        appliedAt: t0ms + 10,
        sentAt: t0ms + 10000,
      });
      expect(await handler({Records: [mockRecord]}, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(logger.warn).toHaveBeenCalledWith('Event received predates last applied event for this user.');
      expect(logAndPublishMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_STALE);
      expect(sendAuditEvent).toHaveBeenCalledWith('AIS_INTERVENTION_IGNORED_STALE', 'abc', {
        intervention: EventsEnum.FRAUD_BLOCK_ACCOUNT,
        reason: 'Received intervention pre-dates latest applied intervention',
      })
    })

    it('should do additional checks if event is from fraud', async () => {
      eventValidationMock.mockReturnValueOnce(undefined);
      interventionEventValidationMock.mockReturnValue(void 0);
      mockRetrieveRecords.mockReturnValue({
        blocked: false,
        reproveIdentity: false,
        resetPassword: false,
        suspended: false,
        isAccountDeleted: true
      });
      mockRecord = {
        messageId: '123',
        receiptHandle: '',
        body: JSON.stringify({
          timestamp: t0s,
          event_timestamp_ms: t0ms,
          user: {
            user_id: 'abc',
          },
          event_name: 'TICF_ACCOUNT_INTERVENTION',
          extension: {
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
      expect(await handler({ Records: [mockRecord] }, mockContext)).toEqual({
        batchItemFailures: [],
      });
    });
    it('should not retry if too many items returned', async () => {
      eventValidationMock.mockReturnValueOnce(undefined);
      mockRetrieveRecords.mockRejectedValueOnce(new TooManyRecordsError('Too many records'));
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(logger.warn).toHaveBeenCalledWith('TooManyRecordsError caught, message will not be retried.');
    });
  });
});
