import { DynamoDBStateResult, TxMAIngressEvent as TxMAEvent } from '../../data-types/interfaces';
import {
  validateEventAgainstSchema,
  validateEventIsNotInFuture,
  validateEventIsNotStale,
  validateInterventionEvent,
  validateLevelOfConfidence,
} from '../validate-event';
import logger from '../../commons/logger';
import { logAndPublishMetric } from '../../commons/metrics';
import { ValidationError } from '../../data-types/errors';
import { EventsEnum, MetricNames } from '../../data-types/constants';
import { sendAuditEvent } from '../send-audit-events';
import { getCurrentTimestamp } from '../../commons/get-current-timestamp';

jest.mock('../../commons/metrics');
jest.mock('@aws-lambda-powertools/logger');
jest.mock('../send-audit-events');
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
      event_name: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
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
      event_name: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
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
    expect(logAndPublishMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
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
    expect(logAndPublishMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });

  it('should return an error as extensions do not contain required fields', () => {
    const TxMAEvent: TxMAEvent = {
      event_timestamp_ms: timestamp.milliseconds - 5000,
      component_id: 'AUTH',
      timestamp: timestamp.seconds - 5,
      user: { user_id: 'USERID' },
      event_name: 'TICF_ACCOUNT_INTERVENTION',
      extensions: {},
    };
    expect(() => validateEventAgainstSchema(TxMAEvent)).toThrow(new ValidationError('Invalid intervention event.'));
    expect(logger.debug).toHaveBeenCalledWith('Sensitive info - Event has failed schema validation.', {
      validationErrors: expect.anything(),
    });
    expect(logAndPublishMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });

  it('should return an error as intervention code is NAN', () => {
    const TxMAEvent: TxMAEvent = {
      event_timestamp_ms: timestamp.milliseconds - 5000,
      component_id: 'AUTH',
      timestamp: timestamp.seconds - 5,
      user: {
        user_id: 'abc',
      },
      event_name: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
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
    expect(logAndPublishMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });

  it('should throw an error if event is stale', async () => {
    const staleEvent = {
      timestamp: timestamp.seconds - 10,
      event_timestamp_ms: timestamp.milliseconds - 10_000,
      event_name: 'TICF_ACCOUNT_INTERVENTION',
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
      async () => await validateEventIsNotStale(EventsEnum.FRAUD_SUSPEND_ACCOUNT, staleEvent, dynamoDBResult),
    ).rejects.toThrow(new ValidationError('Event received predates last applied event for this user.'));
    expect(logAndPublishMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_EVENT_STALE);
    expect(sendAuditEvent).toHaveBeenCalledWith('AIS_INTERVENTION_IGNORED_STALE', 'urn:fdc:gov.uk:2022:USER_ONE', {
      appliedAt: undefined,
      intervention: 'FRAUD_SUSPEND_ACCOUNT',
      reason: 'Received intervention predates latest applied intervention',
    });
  });

  it('should not throw if event is not stale', async () => {
    const nonStaleEvent = {
      timestamp: timestamp.seconds,
      event_name: 'TICF_ACCOUNT_INTERVENTION',
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
      validateEventIsNotStale(EventsEnum.FRAUD_SUSPEND_ACCOUNT, nonStaleEvent, dynamoDBResult),
    ).resolves.toEqual(undefined);
    expect(logAndPublishMetric).not.toHaveBeenCalled();
    expect(sendAuditEvent).not.toHaveBeenCalled();
  });

  it('should throw an error if event timestamp is in the future', async () => {
    const eventInTheFuture = {
      timestamp: timestamp.seconds + 10,
      event_name: 'TICF_ACCOUNT_INTERVENTION',
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
    expect(logAndPublishMetric).toHaveBeenCalledWith(MetricNames.INTERVENTION_IGNORED_IN_FUTURE);
    expect(sendAuditEvent).toHaveBeenCalledWith('AIS_INTERVENTION_IGNORED_IN_FUTURE', 'urn:fdc:gov.uk:2022:USER_ONE', {
      appliedAt: undefined,
      intervention: 'FRAUD_SUSPEND_ACCOUNT',
      reason: 'received event is in the future',
    });
  });

  it('should not throw an error if the event is not in the future', async () => {
    const eventNotInTheFuture = {
      timestamp: timestamp.seconds - 10,
      event_timestamp_ms: timestamp.milliseconds - 10_000,
      event_name: 'TICF_ACCOUNT_INTERVENTION',
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
    expect(logAndPublishMetric).not.toHaveBeenCalled();
    expect(sendAuditEvent).not.toHaveBeenCalled();
  });

  it('should throw if level of confidence is too low for a ID Reset event', () => {
    const idResetEventLowConfidence = {
      event_name: 'IPV_IDENTITY_ISSUED',
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
    expect(logAndPublishMetric).toHaveBeenCalledWith(MetricNames.CONFIDENCE_LEVEL_TOO_LOW);
  });

  it('should not throw if level of confidence is high enough for a ID Reset event', () => {
    const idResetEvent = {
      event_name: 'IPV_IDENTITY_ISSUED',
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
    expect(logAndPublishMetric).not.toHaveBeenCalled();
  });

  it('should throw if level of confidence field is not present in an ID Reset event', () => {
    const idResetEventLowConfidence = {
      event_name: 'IPV_IDENTITY_ISSUED',
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
    expect(logAndPublishMetric).toHaveBeenCalledWith(MetricNames.CONFIDENCE_LEVEL_TOO_LOW);
  });
});
