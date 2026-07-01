import { DynamoDBStateResult } from '../../data-types/interfaces';
import {
  validateEventAgainstSchema,
  validateEventIsNotInFuture,
  validateEventIsNotStale,
  validateIfIdentityAcquired,
  attemptToParseJson,
} from '../validate-event';
import logger from '../../commons/logger';
import { addMetric } from '../../commons/metrics';
import { ValidationError } from '../../data-types/errors';
import { AISInterventionTypes, EventsEnum, MetricNames, TriggerEventsEnum } from '../../data-types/constants';
import { sendAuditEvent } from '../send-audit-events';
import { getCurrentTimestamp } from '../../commons/get-current-timestamp';
import { TICF_ACCOUNT_INTERVENTION } from '@govuk-one-login/event-catalogue/TICF_ACCOUNT_INTERVENTION';

vi.mock('../../commons/metrics');
vi.mock('@aws-lambda-powertools/logger');
vi.mock('../send-audit-events');
const FIXED_TIME_MS = 1234567890;

const dynamoDBResult: DynamoDBStateResult = {
  blocked: false,
  suspended: false,
  reproveIdentity: false,
  resetPassword: false,
  sentAt: FIXED_TIME_MS - 5000,
  appliedAt: FIXED_TIME_MS - 5000,
  isAccountDeleted: false,
  history: [],
  intervention: AISInterventionTypes.AIS_ACCOUNT_UNSUSPENDED,
};

describe('validateEventAgainstSchema', () => {
  let timestamp: ReturnType<typeof getCurrentTimestamp>;
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1234567890);
    timestamp = getCurrentTimestamp();
  })

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('Successfully validate AUTH_PASSWORD_RESET_SUCCESSFUL event', () => {
    const TxMAEvent = {
      event_timestamp_ms: timestamp.milliseconds - 5000,
      component_id: 'AUTH',
      timestamp: timestamp.seconds - 5,
      user: {
        user_id: 'abc',
      },
      event_name: TriggerEventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
      event_id: '123',
    };
    expect(() => {
      validateEventAgainstSchema(TxMAEvent);
    }).not.toThrow();
    expect(addMetric).not.toHaveBeenCalledWith('INVALID_EVENT_RECEIVED_EVENT_CATALOGUE', undefined, undefined, {
      EVENT_NAME: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
    });
  });

  it('Successfully validate TICF_ACCOUNT_INTERVENTION event', () => {
    const TxMAEvent: TICF_ACCOUNT_INTERVENTION & { event_id: string } = {
      event_timestamp_ms: timestamp.milliseconds - 5000,
      component_id: 'AUTH',
      timestamp: timestamp.seconds - 5,
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
    expect(() => {
      validateEventAgainstSchema(TxMAEvent);
    }).not.toThrow();
    expect(addMetric).not.toHaveBeenCalledWith('INVALID_EVENT_RECEIVED_EVENT_CATALOGUE', undefined, undefined, {
      EVENT_NAME: 'TICF_ACCOUNT_INTERVENTION',
    });
  });

  it('Send metric for event that fails event catalogue validation', () => {
    const TxMAEvent = {
      event_timestamp_ms: timestamp.milliseconds - 5000,
      component_id: 'AUTH',
      timestamp: timestamp.seconds - 5,
      user: {
        user_id: 'abc',
      },
      event_name: TriggerEventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
      event_id: '123',
      blah: 'value',
    };
    expect(() => {
      validateEventAgainstSchema(TxMAEvent);
    }).not.toThrow();
    expect(addMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED_EVENT_CATALOGUE', undefined, undefined, {
      EVENT_NAME: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
    });
  });

  it('should return an error as intervention is invalid', () => {
    const TxMAEvent = {
      timestamp: timestamp.seconds - 5,
      event_timestamp_ms: timestamp.milliseconds - 5000,
      component_id: 'TCIF',
      user: {
        user_id: 'abc',
      },
      event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
      event_id: '123',
      extensions: {
        intervention: {
          intervention_reason: 'reason',
          // Missing required intervention_code
        },
      },
    };
    expect(() => {
      validateEventAgainstSchema(TxMAEvent);
    }).toThrow(new ValidationError('Invalid intervention event.'));
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.debug).toHaveBeenCalledWith('Sensitive info - Event has failed schema validation.', {
      validationErrors: expect.anything() as unknown,
    });
    expect(addMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });

  it('should return an error as event is invalid', () => {
    const TxMAEvent = {
      timestamp: timestamp.seconds - 5,
      user: {},
      event_name: 'event',
      extensions: {
        intervention: {
          intervention_code: '01',
          intervention_reason: 'reason',
        },
      },
    };
    expect(() => {
      validateEventAgainstSchema(TxMAEvent);
    }).toThrow(new ValidationError('Invalid intervention event.'));
  });

  it('should return an error as extensions do not contain required fields', () => {
    const TxMAEvent = {
      event_timestamp_ms: timestamp.milliseconds - 5000,
      component_id: 'AUTH',
      timestamp: timestamp.seconds - 5,
      user: { user_id: 'USERID' },
      event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
      event_id: '123',
      extensions: {},
    };
    expect(() => {
      validateEventAgainstSchema(TxMAEvent);
    }).toThrow(new ValidationError('Invalid intervention event.'));
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.debug).toHaveBeenCalledWith('Sensitive info - Event has failed schema validation.', {
      validationErrors: expect.anything() as unknown,
    });
    expect(addMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });

  it('should throw an error if event is stale', async () => {
    const staleEvent = {
      timestamp: timestamp.seconds - 10,
      event_timestamp_ms: timestamp.milliseconds - 10000,
      event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION as const,
      event_id: '123',
      component_id: 'TICF_CRI',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      extensions: {
        intervention: {
          intervention_code: '01',
          intervention_reason: 'something',
          originating_component_id: 'CMS',
          originator_reference_id: '1234567',
          requester_id: '1234567',
        },
      },
    };

    await expect(async () => {
      await validateEventIsNotStale(
        EventsEnum.FRAUD_SUSPEND_ACCOUNT,
        staleEvent,
        {
          blocked: false,
          suspended: false,
          resetPassword: false,
          reproveIdentity: false,
        },
        dynamoDBResult,
      );
    }).rejects.toThrow(new ValidationError('Event received predates last applied event for this user.'));
    expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_STALE);
    expect(sendAuditEvent).toHaveBeenCalledWith('AIS_EVENT_IGNORED_STALE', 'FRAUD_SUSPEND_ACCOUNT', staleEvent, {
      stateResult: { blocked: false, reproveIdentity: false, resetPassword: false, suspended: false },
      interventionName: 'AIS_NO_INTERVENTION',
      nextAllowableInterventions: ['01', '03', '04', '05', '06'],
    });
  });

  it('should throw an error if event is stale', async () => {
    const staleEvent = {
      timestamp: timestamp.seconds - 5000,
      event_timestamp_ms: timestamp.milliseconds - 5000,
      event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION as const,
      event_id: '123',
      component_id: 'TICF_CRI',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      extensions: {
        intervention: {
          intervention_code: '01',
          intervention_reason: 'something',
          originating_component_id: 'CMS',
          originator_reference_id: '1234567',
          requester_id: '1234567',
        },
      },
    };

    await expect(async () => {
      await validateEventIsNotStale(
        EventsEnum.FRAUD_SUSPEND_ACCOUNT,
        staleEvent,
        {
          blocked: false,
          suspended: false,
          resetPassword: false,
          reproveIdentity: false,
        },
        dynamoDBResult,
      );
    }).rejects.toThrow(new ValidationError('Event received predates last applied event for this user.'));
    expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_STALE);
    expect(sendAuditEvent).toHaveBeenCalledWith('AIS_EVENT_IGNORED_STALE', 'FRAUD_SUSPEND_ACCOUNT', staleEvent, {
      stateResult: { blocked: false, reproveIdentity: false, resetPassword: false, suspended: false },
      interventionName: 'AIS_NO_INTERVENTION',
      nextAllowableInterventions: ['01', '03', '04', '05', '06'],
    });
  });

  it('should not throw if event is not stale', async () => {
    const nonStaleEvent = {
      timestamp: timestamp.seconds,
      event_timestamp_ms: timestamp.milliseconds,
      event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION as const,
      event_id: '123',
      component_id: 'TICF_CRI',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      extensions: {
        intervention: {
          intervention_code: '01',
          intervention_reason: 'something',
          originating_component_id: 'CMS',
          originator_reference_id: '1234567',
          requester_id: '1234567',
        },
      },
    };

    await expect(
      validateEventIsNotStale(
        EventsEnum.FRAUD_SUSPEND_ACCOUNT,
        nonStaleEvent,
        {
          blocked: false,
          suspended: false,
          resetPassword: false,
          reproveIdentity: false,
        },
        dynamoDBResult,
      ),
    ).resolves.toEqual(undefined);
    expect(addMetric).not.toHaveBeenCalled();
    expect(sendAuditEvent).not.toHaveBeenCalled();
  });

  it('should throw an error if event timestamp is in the future', async () => {
    const eventInTheFuture = {
      timestamp: timestamp.seconds + 10,
      event_timestamp_ms: (timestamp.seconds + 10) * 1000,
      event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION as const,
      event_id: '123',
      component_id: 'TICF_CRI',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      extensions: {
        intervention: {
          intervention_code: '01',
          intervention_reason: 'something',
          originating_component_id: 'CMS',
          originator_reference_id: '1234567',
          requester_id: '1234567',
        },
      },
    };
    await expect(async () => {
      await validateEventIsNotInFuture(EventsEnum.FRAUD_SUSPEND_ACCOUNT, eventInTheFuture);
    }).rejects.toThrow('Event has timestamp that is in the future.');
    expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_IGNORED_IN_FUTURE);
    expect(sendAuditEvent).toHaveBeenCalledWith(
      'AIS_EVENT_IGNORED_IN_FUTURE',
      'FRAUD_SUSPEND_ACCOUNT',
      eventInTheFuture,
    );
  });

  it('should not throw an error if the event is not in the future', async () => {
    const eventNotInTheFuture = {
      timestamp: timestamp.seconds - 10,
      event_timestamp_ms: timestamp.milliseconds - 10000,
      event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION as const,
      event_id: '123',
      component_id: 'TICF_CRI',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      extensions: {
        intervention: {
          intervention_code: '01',
          intervention_reason: 'something',
          originating_component_id: 'CMS',
          originator_reference_id: '1234567',
          requester_id: '1234567',
        },
      },
    };
    await expect(validateEventIsNotInFuture(EventsEnum.FRAUD_SUSPEND_ACCOUNT, eventNotInTheFuture)).resolves.toEqual(
      undefined,
    );
    expect(addMetric).not.toHaveBeenCalled();
    expect(sendAuditEvent).not.toHaveBeenCalled();
  });

  it('should throw if success is false for a ID Reset event', () => {
    const idResetEventWithoutSuccess = {
      event_name: EventsEnum.IPV_ACCOUNT_INTERVENTION_END as const,
      event_id: '123',
      event_timestamp_ms: 1234567000,
      timestamp: 1234567,
      component_id: 'https://identity.account.gov.uk',
      user: {
        user_id: 'urn:fdc:gov.uk:2022:USER_ONE',
        session_id: 'uOyXUiLAOlcty42HZw6Hgmrlvx7WVraU4JIOli8DHSM',
        govuk_signin_journey_id: 'EKRb611GMsL_mOe7Yw8FU3fIaMw',
        ip_address: '123.123.123.123',
      },
      extensions: {
        type: 'reprove_identity',
        success: false,
      },
    };
    expect(() => {
      validateIfIdentityAcquired(idResetEventWithoutSuccess);
    }).toThrow(new ValidationError('Received event that does not meet criteria to lift intervention.'));
    expect(addMetric).toHaveBeenCalledWith(MetricNames.IDENTITY_NOT_SUFFICIENTLY_PROVED);
  });

  it('should not throw if success is true for a ID Reset event', () => {
    const idResetEvent = {
      event_name: EventsEnum.IPV_ACCOUNT_INTERVENTION_END as const,
      event_id: '123',
      timestamp: 1234567,
      event_timestamp_ms: 1234567000,
      client_id: 'UNKNOWN',
      component_id: 'https://identity.account.gov.uk',
      user: {
        user_id: 'urn:fdc:gov.uk:2022:USER_ONE',
        session_id: 'uOyXUiLAOlcty42HZw6Hgmrlvx7WVraU4JIOli8DHSM',
        govuk_signin_journey_id: 'EKRb611GMsL_mOe7Yw8FU3fIaMw',
        ip_address: '123.123.123.123',
      },
      extensions: {
        type: 'reprove_identity',
        success: true,
      },
    };
    expect(() => {
      validateIfIdentityAcquired(idResetEvent);
    }).not.toThrow();
    expect(addMetric).not.toHaveBeenCalled();
  });

  it('should throw if success field is not present in an ID Reset event', () => {
    const idResetEventLowConfidence = {
      event_name: EventsEnum.IPV_ACCOUNT_INTERVENTION_END as const,
      event_id: '123',
      timestamp: 1234567,
      event_timestamp_ms: 1234567000,
      client_id: 'UNKNOWN',
      component_id: 'https://identity.account.gov.uk',
      user: {
        user_id: 'urn:fdc:gov.uk:2022:USER_ONE',
        session_id: 'uOyXUiLAOlcty42HZw6Hgmrlvx7WVraU4JIOli8DHSM',
        govuk_signin_journey_id: 'EKRb611GMsL_mOe7Yw8FU3fIaMw',
        ip_address: '123.123.123.123',
      },
      extensions: {
        type: 'reprove_identity',
      },
    };
    expect(() => {
      validateIfIdentityAcquired(idResetEventLowConfidence);
    }).toThrow(new ValidationError('Received event that does not meet criteria to lift intervention.'));
    expect(addMetric).toHaveBeenCalledWith(MetricNames.IDENTITY_NOT_SUFFICIENTLY_PROVED);
  });
});

describe('attemptToParseJson', () => {
  it('should parse valid JSON', () => {
    const jsonString = '{"key": "value"}';
    const result = attemptToParseJson(jsonString);
    expect(result).toEqual({ key: 'value' });
  });

  it('should return null for invalid JSON', () => {
    const jsonString = '{"key": "value"';
    expect(() => attemptToParseJson(jsonString)).toThrow('record body could not be parsed to valid JSON.');
  });
});
