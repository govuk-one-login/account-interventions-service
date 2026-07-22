import { Mock } from 'vitest';
import logger from '../../commons/logger';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { addMetric } from '../../commons/metrics';
import { AccountStateEngine } from '../../services/account-states/account-state-engine';
import { getCurrentTimestamp } from '../../commons/get-current-timestamp';
import { TooManyRecordsError } from '../../data-types/errors';
import { EventsEnum, MetricNames, TriggerEventsEnum } from '../../data-types/constants';
import { sendAuditEvent } from '../../services/send-audit-events';
import { publishTimeToResolveMetrics } from '../../commons/metrics-helper';
import { InterventionEventMessage, TicfAccountIntervention } from '../../contracts/intervention-events';
import { InMemoryInterventionEventsService } from '../../tables/intervention-events';
import { InMemoryAccountStatusService } from '../../tables/account-status';
import { processInterventions } from '../interventions-processor';
import { SQSClient } from '@aws-sdk/client-sqs';

vi.mock('@aws-lambda-powertools/logger');
vi.mock('../../commons/metrics');
vi.mock('../../services/send-audit-events');
vi.mock('../../commons/metrics-helper');

const FIXED_TIME_MS = 1234567890;
const FIXED_TIME_S = 1234567;

const mockSqsClient = {} as SQSClient;

const interventionEventBody: InterventionEventMessage = {
  component_id: '',
  timestamp: FIXED_TIME_S - 5,
  event_timestamp_ms: FIXED_TIME_MS - 5000,
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

const interventionEventBodyInTheFuture: TicfAccountIntervention = {
  component_id: '',
  timestamp: FIXED_TIME_S + 5,
  event_timestamp_ms: FIXED_TIME_MS + 5000,
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
  timestamp: FIXED_TIME_S - 5,
  event_timestamp_ms: FIXED_TIME_MS - 5000,
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

const accountStateEngine = AccountStateEngine.getInstance();

const emptyInterventionEventsService = new InMemoryInterventionEventsService([]);
const config = { historyRetentionSeconds: 1000, txmaEgressQueueUrl: 'https://sqs.eu-west-2.amazonaws.com/123456789/txma-egress-queue' };

describe('intervention processor handler', () => {
  let mockEvent: SQSEvent;
  let mockRecord: SQSRecord;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIME_MS);
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
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe('handle', () => {
    it('does nothing if SQS event contains no record', async () => {
      const loggerWarnSpy = vi.spyOn(logger, 'warn');
      await processInterventions(
        { Records: [] },
        new InMemoryAccountStatusService({
          baseStatus: {
            blocked: false,
            reproveIdentity: false,
            resetPassword: false,
            suspended: false,
            sentAt: 1234,
            appliedAt: 7890,
            isAccountDeleted: false,
            history: [],
            intervention: '',
          },
        }),
        emptyInterventionEventsService,
        accountStateEngine,
        config,
        mockSqsClient,
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith('Received no records.');
      expect(addMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should not retry if message body cannot be parsed to valid JSON', async () => {
      mockRecord.body = ' ';
      expect(
        await processInterventions(
          mockEvent,
          new InMemoryAccountStatusService(),
          emptyInterventionEventsService,
          accountStateEngine,
          config,
          mockSqsClient,
        ),
      ).toEqual({
        batchItemFailures: [],
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.error).toHaveBeenCalledWith('Sensitive info - record body could not be parsed to valid JSON.', {
        error: new SyntaxError('Unexpected end of JSON input'),
      });
      expect(addMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
    });

    it('should not retry the record if a StateTransitionError is received', async () => {
      // Set up account in 'blocked' state
      const blockedAccount = {
        blocked: true,
        reproveIdentity: false,
        resetPassword: false,
        suspended: false,
        sentAt: 1234,
        appliedAt: 7890,
        isAccountDeleted: false,
        history: [],
        intervention: 'AIS_ACCOUNT_BLOCKED',
      };

      // Set up event body for suspend account - this is not allowed from AccountIsBlocked state
      const suspendEventBody = {
        component_id: '',
        timestamp: FIXED_TIME_S - 5,
        event_timestamp_ms: FIXED_TIME_MS - 5000,
        user: { user_id: 'abc' },
        event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
        event_id: '123',
        extensions: {
          intervention: {
            intervention_code: '01',
            intervention_reason: 'reason',
          },
        },
      };
      mockRecord.body = JSON.stringify(suspendEventBody);
      expect(
        await processInterventions(
          mockEvent,
          new InMemoryAccountStatusService({
            baseStatus: blockedAccount,
          }),
          emptyInterventionEventsService,
          accountStateEngine,
          config,
          mockSqsClient,
        ),
      ).toEqual({
        batchItemFailures: [],
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.warn).toHaveBeenCalledWith('StateTransitionError caught, message will not be retried.', {
        errorMessage: 'FRAUD_SUSPEND_ACCOUNT is not allowed from current state. Current state: AIS_ACCOUNT_BLOCKED',
      });
      expect(sendAuditEvent).toHaveBeenLastCalledWith(
        'AIS_EVENT_TRANSITION_IGNORED',
        EventsEnum.FRAUD_SUSPEND_ACCOUNT,
        interventionEventBody,
        mockSqsClient,
        config.txmaEgressQueueUrl,
        {
          stateResult: {
            blocked: true,
            reproveIdentity: false,
            resetPassword: false,
            suspended: false,
          },
          interventionName: 'AIS_NO_INTERVENTION',
          nextAllowableInterventions: ['07'],
        },
      );
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should succeed when a valid intervention event is received', async () => {
      // Set up account in 'suspended' state
      const suspendedAccount = {
        blocked: false,
        reproveIdentity: false,
        resetPassword: false,
        suspended: true,
        sentAt: 1234,
        appliedAt: 7890,
        isAccountDeleted: false,
        history: [],
        intervention: 'AIS_ACCOUNT_SUSPENDED',
      };
      // Set up event to 'block' account
      const blockEventBody = {
        component_id: '',
        timestamp: FIXED_TIME_S - 5,
        event_timestamp_ms: FIXED_TIME_MS - 5000,
        user: { user_id: 'abc' },
        event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
        event_id: '123',
        extensions: {
          intervention: {
            intervention_code: '03',
            intervention_reason: 'reason',
          },
        },
      };
      mockRecord.body = JSON.stringify(blockEventBody);
      expect(
        await processInterventions(
          mockEvent,
          new InMemoryAccountStatusService({
            baseStatus: suspendedAccount,
          }),
          emptyInterventionEventsService,
          accountStateEngine,
          config,
          mockSqsClient,
        ),
      ).toEqual({
        batchItemFailures: [],
      });
      expect(sendAuditEvent).toHaveBeenLastCalledWith(
        'AIS_EVENT_TRANSITION_APPLIED',
        EventsEnum.FRAUD_BLOCK_ACCOUNT,
        blockEventBody,
        mockSqsClient,
        config.txmaEgressQueueUrl,
        {
          stateResult: {
            blocked: true,
            reproveIdentity: false,
            resetPassword: false,
            suspended: false,
          },
          interventionName: 'AIS_ACCOUNT_BLOCKED',
          nextAllowableInterventions: ['07'],
        },
      );
      expect(addMetric).toHaveBeenCalledWith(MetricNames.EVENT_DELIVERY_LATENCY, [], 5000);
      expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_APPLIED, [], 1, {
        eventName: 'FRAUD_BLOCK_ACCOUNT',
      });
      expect(publishTimeToResolveMetrics).toHaveBeenCalledTimes(1);
    });

    it('should succeed when an intervention event is received for a non existing user', async () => {
      expect(
        await processInterventions(
          mockEvent,
          new InMemoryAccountStatusService(),
          emptyInterventionEventsService,
          accountStateEngine,
          config,
          mockSqsClient,
        ),
      ).toEqual({
        batchItemFailures: [],
      });
      expect(sendAuditEvent).toHaveBeenLastCalledWith(
        'AIS_EVENT_TRANSITION_APPLIED',
        EventsEnum.FRAUD_SUSPEND_ACCOUNT,
        interventionEventBody,
        mockSqsClient,
        config.txmaEgressQueueUrl,
        {
          stateResult: {
            blocked: false,
            reproveIdentity: false,
            resetPassword: false,
            suspended: true,
          },
          interventionName: 'AIS_ACCOUNT_SUSPENDED',
          nextAllowableInterventions: ['02', '03', '04', '05', '06'],
        },
      );
      expect(addMetric).toHaveBeenCalledWith(MetricNames.EVENT_DELIVERY_LATENCY, [], 5000);
      expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_APPLIED, [], 1, {
        eventName: 'FRAUD_SUSPEND_ACCOUNT',
      });
      expect(publishTimeToResolveMetrics).toHaveBeenCalledTimes(1);
    });

    it('should succeed when a valid user action event is received', async () => {
      const accountNeedingPasswordReset = {
        blocked: false,
        reproveIdentity: false,
        resetPassword: true,
        suspended: true,
        sentAt: 1234,
        appliedAt: 7890,
        isAccountDeleted: false,
        history: [],
        intervention: 'AIS_FORCED_USER_PASSWORD_RESET',
      };

      mockRecord.body = JSON.stringify(resetPasswordEventBody);
      mockEvent.Records = [mockRecord];
      expect(
        await processInterventions(
          mockEvent,
          new InMemoryAccountStatusService({ baseStatus: accountNeedingPasswordReset }),
          emptyInterventionEventsService,
          accountStateEngine,
          config,
          mockSqsClient,
        ),
      ).toEqual({
        batchItemFailures: [],
      });
      expect(sendAuditEvent).toHaveBeenLastCalledWith(
        'AIS_EVENT_TRANSITION_APPLIED',
        EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
        {
          component_id: 'UNKNOWN',
          event_id: '123',
          event_name: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
          event_timestamp_ms: 1234562890,
          timestamp: 1234562,
          user: {
            user_id: 'abc',
          },
        },
        mockSqsClient,
        config.txmaEgressQueueUrl,
        {
          stateResult: {
            blocked: false,
            reproveIdentity: false,
            resetPassword: false,
            suspended: false,
          },
          interventionName: undefined,
          nextAllowableInterventions: ['01', '03', '04', '05', '06'],
        },
      );

      expect(addMetric).toHaveBeenCalledWith(MetricNames.EVENT_DELIVERY_LATENCY, [], 5000);
      expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_APPLIED, [], 1, {
        eventName: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
      });
      expect(publishTimeToResolveMetrics).toHaveBeenCalledTimes(1);
    });

    it('should not process the event if the user account is marked as deleted', async () => {
      const deletedAccount = {
        blocked: false,
        reproveIdentity: false,
        resetPassword: false,
        suspended: false,
        sentAt: 1234,
        appliedAt: 7890,
        isAccountDeleted: true,
        history: [],
        intervention: '',
      };
      expect(
        await processInterventions(
          mockEvent,
          new InMemoryAccountStatusService({ baseStatus: deletedAccount }),
          emptyInterventionEventsService,
          accountStateEngine,
          config,
          mockSqsClient,
        ),
      ).toEqual({
        batchItemFailures: [],
      });
      expect(addMetric).toHaveBeenLastCalledWith(MetricNames.ACCOUNT_IS_MARKED_AS_DELETED);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect((logger.warn as Mock).mock.calls).toEqual([
        ['Sensitive info - user abc account has been deleted.'],
        ['ValidationError caught, message will not be retried.', { errorMessage: 'Account is marked as deleted.' }],
      ]);
      expect(sendAuditEvent).toHaveBeenLastCalledWith(
        'AIS_EVENT_IGNORED_ACCOUNT_DELETED',
        EventsEnum.FRAUD_SUSPEND_ACCOUNT,
        interventionEventBody,
        mockSqsClient,
        config.txmaEgressQueueUrl,
        {
          stateResult: {
            blocked: false,
            reproveIdentity: false,
            resetPassword: false,
            suspended: false,
          },
          interventionName: 'AIS_NO_INTERVENTION',
          nextAllowableInterventions: ['01', '03', '04', '05', '06'],
        },
      );
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should return message id to be retried if event is in the future', async () => {
      mockRecord.body = JSON.stringify(interventionEventBodyInTheFuture);
      expect(
        await processInterventions(
          { Records: [mockRecord] },
          new InMemoryAccountStatusService(),
          emptyInterventionEventsService,
          accountStateEngine,
          config,
          mockSqsClient,
        ),
      ).toEqual({
        batchItemFailures: [
          {
            itemIdentifier: '123',
          },
        ],
      });
      expect(addMetric).toHaveBeenCalledWith('INTERVENTION_IGNORED_IN_FUTURE');
      expect(sendAuditEvent).toHaveBeenLastCalledWith(
        'AIS_EVENT_IGNORED_IN_FUTURE',
        EventsEnum.FRAUD_SUSPEND_ACCOUNT,
        interventionEventBodyInTheFuture,
        mockSqsClient,
        config.txmaEgressQueueUrl,
      );
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.warn).toHaveBeenCalledWith('Event with timestamp in the future.', {
        currentTime: '1970-01-15T06:56:07.890Z',
        emittedAt: '1970-01-15T06:56:12.890Z',
        event: 'FRAUD_SUSPEND_ACCOUNT',
        eventName: 'TICF_ACCOUNT_INTERVENTION',
        msInTheFuture: 5000,
      });
    });

    it('should ignore the event if body is invalid', async () => {
      const invalidBody = {
        component_id: '',
        timestamp: FIXED_TIME_S - 5,
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
      mockRecord.body = JSON.stringify(invalidBody);
      expect(
        await processInterventions(
          mockEvent,
          new InMemoryAccountStatusService(),
          emptyInterventionEventsService,
          accountStateEngine,
          config,
          mockSqsClient,
        ),
      ).toEqual({
        batchItemFailures: [],
      });
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should return message id to be retried if dynamo db operation fails', async () => {
      const error = new Error('Error');
      expect(
        await processInterventions(
          mockEvent,
          new InMemoryAccountStatusService({ error }),
          emptyInterventionEventsService,
          accountStateEngine,
          config,
          mockSqsClient,
        ),
      ).toEqual({
        batchItemFailures: [
          {
            itemIdentifier: '123',
          },
        ],
      });
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.error).toHaveBeenCalledWith('Error caught, message will be retried.', { errorMessage: 'Error' });
    });

    it('should not process the event and return if the event timestamp predates the latest applied intervention for the user ', async () => {
      expect(
        await processInterventions(
          { Records: [mockRecord] },
          new InMemoryAccountStatusService({
            baseStatus: {
              blocked: false,
              reproveIdentity: false,
              resetPassword: false,
              suspended: false,
              appliedAt: FIXED_TIME_MS + 10,
              sentAt: FIXED_TIME_MS + 10000,
              isAccountDeleted: false,
              history: [],
              intervention: '',
            },
          }),
          emptyInterventionEventsService,
          accountStateEngine,
          config,
          mockSqsClient,
        ),
      ).toEqual({
        batchItemFailures: [],
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.warn).toHaveBeenCalledWith('Event received predates last applied event for this user.');
      expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_STALE);
      expect(sendAuditEvent).toHaveBeenCalledWith(
        'AIS_EVENT_IGNORED_STALE',
        EventsEnum.FRAUD_SUSPEND_ACCOUNT,
        interventionEventBody,
        mockSqsClient,
        config.txmaEgressQueueUrl,
        {
          stateResult: {
            blocked: false,
            reproveIdentity: false,
            resetPassword: false,
            suspended: false,
          },
          interventionName: 'AIS_NO_INTERVENTION',
          nextAllowableInterventions: ['01', '03', '04', '05', '06'],
        },
      );
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should successfully process valid event from fraud', async () => {
      mockRecord = {
        messageId: '123',
        receiptHandle: '',
        body: JSON.stringify({
          component_id: '',
          timestamp: FIXED_TIME_S,
          event_timestamp_ms: FIXED_TIME_MS - 5000,
          event_id: '123',
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
      expect(
        await processInterventions(
          { Records: [mockRecord] },
          new InMemoryAccountStatusService({
            baseStatus: {
              blocked: false,
              reproveIdentity: false,
              resetPassword: false,
              suspended: false,
              sentAt: 1234,
              appliedAt: 7890,
              isAccountDeleted: false,
              history: [],
              intervention: '',
            },
          }),
          emptyInterventionEventsService,
          accountStateEngine,
          config,
          mockSqsClient,
        ),
      ).toEqual({
        batchItemFailures: [],
      });
      expect(publishTimeToResolveMetrics).toHaveBeenCalledTimes(1);
    });

    it('should not retry if too many items are returned', async () => {
      const error = new TooManyRecordsError('Too many records');

      expect(
        await processInterventions(
          mockEvent,
          new InMemoryAccountStatusService({ error }),
          emptyInterventionEventsService,
          accountStateEngine,
          config,
          mockSqsClient,
        ),
      ).toEqual({
        batchItemFailures: [],
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.warn).toHaveBeenCalledWith(
        'Too many records were returned from the database. Message will not be retried',
        { errorMessage: 'Too many records' },
      );
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should ignore if Success is false for an ID Reset user action event', async () => {
      mockRecord = {
        messageId: '123',
        receiptHandle: '',
        body: JSON.stringify({
          component_id: 'UNKNOWN',
          event_id: '123',
          timestamp: getCurrentTimestamp().milliseconds + 500000,
          event_timestamp_ms: getCurrentTimestamp().milliseconds + 500000,
          user: {
            user_id: 'abc',
          },
          event_name: 'IPV_ACCOUNT_INTERVENTION_END',
          extensions: {
            type: 'reprove_identity',
            success: false,
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
      expect(
        await processInterventions(
          { Records: [mockRecord] },
          new InMemoryAccountStatusService(),
          emptyInterventionEventsService,
          accountStateEngine,
          config,
          mockSqsClient,
        ),
      ).toEqual({
        batchItemFailures: [],
      });
      expect(addMetric).toHaveBeenCalledWith('IDENTITY_NOT_SUFFICIENTLY_PROVED');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.warn).toHaveBeenCalledWith('Received event that does not meet criteria to lift intervention.', {
        success: false,
        type: 'reprove_identity',
      });
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
    });

    it('should log the expected error line when a message is retried - this line is used by a metric filter for canary deployment alarm', async () => {
      await processInterventions(
        mockEvent,
        new InMemoryAccountStatusService({ error: new Error('Error') }),
        emptyInterventionEventsService,
        accountStateEngine,
        config,
        mockSqsClient,
      );
      expect(publishTimeToResolveMetrics).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.error).toHaveBeenCalledWith('Error caught, message will be retried.', { errorMessage: 'Error' });
    });
  });
});
