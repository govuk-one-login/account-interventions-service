import { DynamoDBStateResult, TxMAIngressEvent as TxMAEvent } from '../../data-types/interfaces';
import {
  validateEventAgainstSchema,
  validateEventIsNotInFuture,
  validateEventIsNotStale,
  validateInterventionEvent,
  validateLevelOfConfidence,
} from '../validate-event';
import logger from '../../commons/logger';
import { addMetric } from '../../commons/metrics';
import { ValidationError } from '../../data-types/errors';
import { EventsEnum, MetricNames, TriggerEventsEnum } from '../../data-types/constants';
import { getCurrentTimestamp } from '../../commons/get-current-timestamp';
import { AuditEvents } from '../audit-events-service';

jest.mock('../../commons/metrics');
jest.mock('@aws-lambda-powertools/logger');
jest.mock('../send-audit-events');
jest.mock('../audit-events-service');
jest.mock('../../commons/get-current-timestamp', () => ({
  getCurrentTimestamp: jest.fn().mockImplementation(() => {
    return {
      milliseconds: 1_234_567_890,
      isoString: 'today',
      seconds: 1_234_567,
    };
  }),
}));

const timestamp = getCurrentTimestamp();

const dynamoDBResult: DynamoDBStateResult = {
  blocked: false,
  suspended: false,
  reproveIdentity: false,
  resetPassword: false,
  sentAt: timestamp.milliseconds - 5000,
  appliedAt: timestamp.milliseconds - 5000,
  isAccountDeleted: false,
  history: [],
};
describe('event-validation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not return anything as event is valid', () => {
    const TxMAEvent: TxMAEvent = {
      event_timestamp_ms: timestamp.milliseconds - 5000,
      component_id: 'AUTH',
      timestamp: timestamp.seconds - 5,
      user: {
        user_id: 'abc',
      },
      event_name: TriggerEventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
      event_id: '123',
      extensions: {
        intervention: {
          intervention_code: '01',
          intervention_reason: 'reason',
        },
      },
    };
    expect(validateEventAgainstSchema(TxMAEvent)).toBeUndefined();
    expect(validateInterventionEvent(TxMAEvent)).toBeUndefined();
  });

  it('should return an error as intervention is invalid', () => {
    const TxMAEvent = {
      timestamp: timestamp.seconds - 5,
      event_timestamp_ms: timestamp.milliseconds - 5000,
      component_id: 'TCIF',
      user: {
        user_id: 'abc',
      },
      event_name: TriggerEventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
      event_id: '123',
      extensions: {
        intervention: {
          intervention_reason: 'reason',
        },
      },
    };
    expect(() => validateEventAgainstSchema(TxMAEvent as TxMAEvent)).toThrow(
      new ValidationError('Invalid intervention event.'),
    );
    expect(logger.debug).toHaveBeenCalledWith('Sensitive info - Event has failed schema validation.', {
      validationErrors: expect.anything(),
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
    expect(() => validateEventAgainstSchema(TxMAEvent as TxMAEvent)).toThrow(
      new ValidationError('Invalid intervention event.'),
    );
    expect(validateInterventionEvent(TxMAEvent as TxMAEvent)).toBeUndefined();
    expect(logger.debug).toHaveBeenCalledWith('Sensitive info - Event has failed schema validation.', {
      validationErrors: expect.anything(),
    });
    expect(addMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });

  it('should return an error as extensions do not contain required fields', () => {
    const TxMAEvent: TxMAEvent = {
      event_timestamp_ms: timestamp.milliseconds - 5000,
      component_id: 'AUTH',
      timestamp: timestamp.seconds - 5,
      user: { user_id: 'USERID' },
      event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
      event_id: '123',
      extensions: {},
    };
    expect(() => validateEventAgainstSchema(TxMAEvent)).toThrow(new ValidationError('Invalid intervention event.'));
    expect(logger.debug).toHaveBeenCalledWith('Sensitive info - Event has failed schema validation.', {
      validationErrors: expect.anything(),
    });
    expect(addMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });

  it('should return an error as intervention code is NAN', () => {
    const TxMAEvent: TxMAEvent = {
      event_timestamp_ms: timestamp.milliseconds - 5000,
      component_id: 'AUTH',
      timestamp: timestamp.seconds - 5,
      user: {
        user_id: 'abc',
      },
      event_name: TriggerEventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
      event_id: '123',
      extensions: {
        intervention: {
          intervention_code: 'nan',
          intervention_reason: 'reason',
        },
      },
    };
    expect(validateEventAgainstSchema(TxMAEvent)).toBeUndefined();
    expect(() => validateInterventionEvent(TxMAEvent)).toThrow(new ValidationError('Invalid intervention event.'));
    expect(logger.debug).toHaveBeenCalledWith('Invalid intervention request. Intervention code is NAN');
    expect(addMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });

  it('should throw an error if event is stale', async () => {
    const staleEvent = {
      timestamp: timestamp.seconds - 10,
      event_timestamp_ms: timestamp.milliseconds - 10_000,
      event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
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
      async () =>
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
        ),
    ).rejects.toThrow(new ValidationError('Event received predates last applied event for this user.'));
    expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_STALE);
    expect(AuditEvents).toHaveBeenCalledWith('IGNORED_STALE', 'FRAUD_SUSPEND_ACCOUNT', staleEvent, {
      stateResult: { blocked: false, reproveIdentity: false, resetPassword: false, suspended: false },
      interventionName: 'AIS_NO_INTERVENTION',
      nextAllowableInterventions: ['01', '03', '04', '05', '06', '25'],
    });
  });

  it('should throw an error if event is stale when operational event is received', async () => {
    const staleEvent = {
      timestamp: timestamp.seconds - 10,
      event_timestamp_ms: timestamp.milliseconds - 10_000,
      event_name: TriggerEventsEnum.OPERATIONAL_ACCOUNT_INTERVENTION,
      event_id: '123',
      component_id: 'TICF_CRI',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      extensions: {
        intervention: {
          intervention_code: '25',
          intervention_reason: 'something',
          originating_component_id: 'CMS',
          originator_reference_id: '1234567',
          requester_id: '1234567',
        },
      },
    };

    await expect(
      async () =>
        await validateEventIsNotStale(
          EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION,
          staleEvent,
          {
            blocked: false,
            suspended: false,
            resetPassword: false,
            reproveIdentity: false,
          },
          dynamoDBResult,
        ),
    ).rejects.toThrow(new ValidationError('Event received predates last applied event for this user.'));
    expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_STALE);
    expect(AuditEvents).toHaveBeenCalledWith('IGNORED_STALE', 'OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION', staleEvent, {
      stateResult: { blocked: false, reproveIdentity: false, resetPassword: false, suspended: false },
      interventionName: 'AIS_NO_INTERVENTION',
      nextAllowableInterventions: ['01', '03', '04', '05', '06', '25'],
    });
  });

  it('should not throw if event is not stale', async () => {
    const nonStaleEvent = {
      timestamp: timestamp.seconds,
      event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
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
    expect(AuditEvents).not.toHaveBeenCalled();
  });

  it('should throw an error if event timestamp is in the future', async () => {
    const eventInTheFuture = {
      timestamp: timestamp.seconds + 10,
      event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
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
    }).rejects.toThrow(new Error('Event is in the future. It will be retried'));
    expect(addMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_IGNORED_IN_FUTURE);
    expect(AuditEvents).toHaveBeenCalledWith(
      'IGNORED_IN_FUTURE',
      'FRAUD_SUSPEND_ACCOUNT',
      eventInTheFuture,
    );
  });

  it('should not throw an error if the event is not in the future', async () => {
    const eventNotInTheFuture = {
      timestamp: timestamp.seconds - 10,
      event_timestamp_ms: timestamp.milliseconds - 10_000,
      event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
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
    expect(AuditEvents).not.toHaveBeenCalled();
  });

  it('should not throw an error if the event is not in the future when operational event is received', async () => {
    const eventNotInTheFuture = {
      timestamp: timestamp.seconds - 10,
      event_timestamp_ms: timestamp.milliseconds - 10_000,
      event_name: TriggerEventsEnum.OPERATIONAL_ACCOUNT_INTERVENTION,
      event_id: '123',
      component_id: 'TICF_CRI',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      extensions: {
        intervention: {
          intervention_code: '25',
          intervention_reason: 'something',
          originating_component_id: 'CMS',
          originator_reference_id: '1234567',
          requester_id: '1234567',
        },
      },
    };
    await expect(validateEventIsNotInFuture(EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION, eventNotInTheFuture)).resolves.toEqual(
      undefined,
    );
    expect(addMetric).not.toHaveBeenCalled();
    expect(AuditEvents).not.toHaveBeenCalled();
  });

  it('should throw if level of confidence is too low for a ID Reset event', () => {
    const idResetEventLowConfidence = {
      event_name: TriggerEventsEnum.IPV_IDENTITY_ISSUED,
      event_id: '123',
      timestamp: 1_234_567,
      client_id: 'UNKNOWN',
      component_id: 'UNKNOWN',
      user: {
        user_id: 'urn:fdc:gov.uk:2022:USER_ONE',
        email: '',
        phone: 'UNKNOWN',
        ip_address: '',
        session_id: '',
        persistent_session_id: '',
        govuk_signin_journey_id: '',
      },
      extensions: {
        levelOfConfidence: 'LessThanP2',
        ciFail: false,
        hasMitigations: false,
      },
    };
    expect(() => validateLevelOfConfidence(EventsEnum.IPV_IDENTITY_ISSUED, idResetEventLowConfidence)).toThrow(
      new ValidationError('Received intervention has low level of confidence.'),
    );
    expect(addMetric).toHaveBeenCalledWith(MetricNames.CONFIDENCE_LEVEL_TOO_LOW);
  });

  it('should not throw if level of confidence is high enough for a ID Reset event', () => {
    const idResetEvent = {
      event_name: TriggerEventsEnum.IPV_IDENTITY_ISSUED,
      event_id: '123',
      timestamp: 1_234_567,
      client_id: 'UNKNOWN',
      component_id: 'UNKNOWN',
      user: {
        user_id: 'urn:fdc:gov.uk:2022:USER_ONE',
        email: '',
        phone: 'UNKNOWN',
        ip_address: '',
        session_id: '',
        persistent_session_id: '',
        govuk_signin_journey_id: '',
      },
      extensions: {
        levelOfConfidence: 'P2',
        ciFail: false,
        hasMitigations: false,
      },
    };
    expect(() => validateLevelOfConfidence(EventsEnum.IPV_IDENTITY_ISSUED, idResetEvent)).not.toThrow();
    expect(addMetric).not.toHaveBeenCalled();
  });

  it('should throw if level of confidence field is not present in an ID Reset event', () => {
    const idResetEventLowConfidence = {
      event_name: TriggerEventsEnum.IPV_IDENTITY_ISSUED,
      event_id: '123',
      timestamp: 1_234_567,
      client_id: 'UNKNOWN',
      component_id: 'UNKNOWN',
      user: {
        user_id: 'urn:fdc:gov.uk:2022:USER_ONE',
        email: '',
        phone: 'UNKNOWN',
        ip_address: '',
        session_id: '',
        persistent_session_id: '',
        govuk_signin_journey_id: '',
      },
      extensions: {
        ciFail: false,
        hasMitigations: false,
      },
    };
    expect(() => validateLevelOfConfidence(EventsEnum.IPV_IDENTITY_ISSUED, idResetEventLowConfidence)).toThrow(
      new ValidationError('Received intervention has low level of confidence.'),
    );
    expect(addMetric).toHaveBeenCalledWith(MetricNames.CONFIDENCE_LEVEL_TOO_LOW);
  });
});
