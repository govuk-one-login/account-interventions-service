import { handler } from '../interventions-processor-handler';
import { ContextExamples } from '@aws-lambda-powertools/commons';
import logger from '../../commons/logger';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { logAndPublishMetric } from '../../commons/metrics';
import { DynamoDatabaseService } from '../../services/dynamo-database-service';
import { validateEvent, validateInterventionEvent } from '../../services/validate-event';
import { AccountStateEngine } from '../../services/account-states/account-state-engine';
import { getCurrentTimestamp } from '../../commons/get-current-timestamp';
import {ValidationError} from "../../data-types/errors";

jest.mock('@aws-lambda-powertools/logger');
jest.mock('../../commons/metrics');
jest.mock('@aws-sdk/util-dynamodb');
jest.mock('../../services/dynamo-database-service');
jest.mock('../../services/validate-event');

const mockRetrieveRecords = DynamoDatabaseService.prototype.retrieveRecordsByUserId as jest.Mock;
const mockUpdateRecords = DynamoDatabaseService.prototype.updateUserStatus as jest.Mock;
const eventValidationMock = validateEvent as jest.Mock;
const interventionEventValidationMock = validateInterventionEvent as jest.Mock;

describe('delete-data-handler', () => {
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

    it('should succeed', async () => {
      eventValidationMock.mockReturnValueOnce(true);
      interventionEventValidationMock.mockReturnValueOnce(true);
      AccountStateEngine.applyEventTransition = jest.fn().mockReturnValueOnce({
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

    it('should fail as timestamp is in the future', async () => {
      eventValidationMock.mockReturnValueOnce(true);
      mockRecord = {
        messageId: '123',
        receiptHandle: '',
        body: JSON.stringify({
          timestamp: getCurrentTimestamp().milliseconds + 500_000,
          user: {
            user_id: 'abc',
          },
          event_name: 'event',
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
      eventValidationMock.mockReturnValueOnce(true);
      interventionEventValidationMock.mockReturnValueOnce(false);
      mockRetrieveRecords.mockRejectedValueOnce('Error');
      expect(await handler(mockEvent, mockContext)).toEqual({
        batchItemFailures: [
          {
            itemIdentifier: '123',
          },
        ],
      });
    });
  });
});
