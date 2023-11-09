import { handler } from '../interventions-processor-handler';
import { ContextExamples } from '@aws-lambda-powertools/commons';
import logger from '../../commons/logger';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { logAndPublishMetric } from '../../commons/metrics';
import { DynamoDatabaseService } from '../../services/dynamo-database-service';
import { validateEvent, validateInterventionEvent } from '../../services/validate-event';
import {
  AccountStateEngine,
} from '../../services/account-states/account-state-engine';
import { getCurrentTimestamp } from '../../commons/get-current-timestamp';
import { StateTransitionError, TooManyRecordsError, ValidationError } from '../../data-types/errors';
import {MetricNames} from "../../data-types/constants";

jest.mock('@aws-lambda-powertools/logger');
jest.mock('../../commons/metrics');
jest.mock('@aws-sdk/util-dynamodb');
jest.mock('../../services/dynamo-database-service');
jest.mock('../../services/validate-event');

const mockRetrieveRecords = DynamoDatabaseService.prototype.retrieveRecordsByUserId as jest.Mock;
const mockUpdateRecords = DynamoDatabaseService.prototype.updateUserStatus as jest.Mock;
const eventValidationMock = validateEvent as jest.Mock;
const interventionEventValidationMock = validateInterventionEvent as jest.Mock;
const accountStateEngine = AccountStateEngine.getInstance();
describe('intervention processor handler', () => {
  let mockEvent: SQSEvent;
  let mockRecord: SQSRecord;
  const mockContext = ContextExamples.helloworldContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecord = {
      messageId: '123',
      receiptHandle: '',
      body: JSON.stringify({
        timestamp: 87_298_174,
        user: {
          user_id: 'abc',
        },
        event_name: 'event',
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
      mockEvent = { Records: [] };
      const loggerWarnSpy = jest.spyOn(logger, 'warn');
      await handler(mockEvent, mockContext);
      expect(loggerWarnSpy).toHaveBeenCalledWith('Received no records.');
      expect(logAndPublishMetric).toHaveBeenCalledWith('INTERVENTION_EVENT_INVALID');
    });

    it('should return a state transition error', async () => {
      eventValidationMock.mockReturnValueOnce(void 0);
      accountStateEngine.applyEventTransition = jest.fn().mockImplementationOnce(() => {
        throw new StateTransitionError('State transition Error');
      });
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(logger.warn).toHaveBeenCalledWith('StateTransitionError caught, message will not be retried.');
    });

    it('should succeed', async () => {
      eventValidationMock.mockReturnValueOnce(void 0);
      accountStateEngine.applyEventTransition = jest.fn().mockReturnValueOnce({
        ExpressionAttributeNames: {
          '#B': 'blocked',
          '#S': 'suspended',
          '#RP': 'resetPassword',
          '#RI': 'reproveIdentity',
          '#UA': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':b': { BOOL: true },
          ':s': { BOOL: true },
          ':rp': { BOOL: false },
          ':ri': { BOOL: false },
          ':ua': { N: '993332' },
        },
        UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua',
      });
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
    });

    it('should not process the event if the user account is marked as deleted', async () => {
      eventValidationMock.mockReturnValueOnce(void 0);
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
      expect(logger.warn).toHaveBeenLastCalledWith('Sensitive info - user abc account has been deleted.')
    });

    it('should fail as timestamp is in the future', async () => {
      eventValidationMock.mockReturnValueOnce(void 0);
      mockRecord = {
        messageId: '123',
        receiptHandle: '',
        body: JSON.stringify({
          timestamp: getCurrentTimestamp().milliseconds + 500_000,
          user: {
            user_id: 'abc',
          },
          event_name: 'event',
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
      expect(await handler({ Records: [mockRecord] }, mockContext)).toEqual({
        batchItemFailures: [
          {
            itemIdentifier: '123',
          },
        ],
      });
      expect(logAndPublishMetric).toHaveBeenCalledWith('INTERVENTION_IGNORED_IN_FUTURE');
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

    it('should not retry if too many items returned', async () => {
      eventValidationMock.mockReturnValueOnce(void 0);
      mockRetrieveRecords.mockRejectedValueOnce(new TooManyRecordsError('Too many records'));
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [],
      });
      expect(logger.warn).toHaveBeenCalledWith('TooManyRecordsError caught, message will not be retried.');
    });

    it('should do additional checks if event is from fraud', async () => {
      eventValidationMock.mockReturnValueOnce(void 0);
      interventionEventValidationMock.mockReturnValue(void 0);
      mockRecord = {
        messageId: '123',
        receiptHandle: '',
        body: JSON.stringify({
          timestamp: getCurrentTimestamp().milliseconds,
          event_timestamp_ms: getCurrentTimestamp().milliseconds,
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
      expect(await handler({ Records: [mockRecord] }, mockContext)).toEqual({
        batchItemFailures: [],
      });
    });

    it('should ignore if level of confidence is not P2', async () => {
      eventValidationMock.mockReturnValueOnce(void 0);
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
            hasMitigations: false
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
      expect(logAndPublishMetric).toHaveBeenCalledWith('CONFIDENCE_LEVEL_TOO_LOW');
      expect(logger.warn).toHaveBeenCalledWith('Received interventions has low level of confidence: P1');
      });
  });
});
