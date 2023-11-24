import { TxMAIngressEvent as TxMAEvent } from '../../data-types/interfaces';
import { validateEvent, validateInterventionEvent } from '../validate-event';
import logger from '../../commons/logger';
import { logAndPublishMetric } from '../../commons/metrics';
import { ValidationError } from '../../data-types/errors';

jest.mock('../../commons/metrics');
jest.mock('@aws-lambda-powertools/logger');
describe('event-validation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not return anything as event is valid', () => {
    const TxMAEvent: TxMAEvent = {
      timestamp: 87_298_174,
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
    expect(validateEvent(TxMAEvent)).toBeUndefined();
    expect(validateInterventionEvent(TxMAEvent)).toBeUndefined();
  });

  it('should return an error as intervention is invalid', () => {
    const TxMAEvent: TxMAEvent = {
      timestamp: 87_298_174,
      user: {
        user_id: 'abc',
      },
      event_name: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
      extensions: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        intervention: {
          intervention_reason: 'reason',
        },
      },
    };
    expect(() => validateEvent(TxMAEvent)).toThrow(new ValidationError('Invalid intervention event.'));
    expect(logger.debug).toHaveBeenCalledWith('Sensitive info - Event has failed schema validation.', { validationErrors: expect.anything() });
    expect(logAndPublishMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });

  it('should return an error as event is invalid', () => {
    const TxMAEvent: TxMAEvent = {
      timestamp: 87_298_174,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      user: {},
      event_name: 'event',
      extensions: {
        intervention: {
          intervention_code: '01',
          intervention_reason: 'reason',
        },
      },
    };
    expect(() => validateEvent(TxMAEvent)).toThrow(new ValidationError('Invalid intervention event.'));
    expect(validateInterventionEvent(TxMAEvent)).toBeUndefined();
    expect(logger.debug).toHaveBeenCalledWith('Sensitive info - Event has failed schema validation.', { validationErrors: expect.anything() });
    expect(logAndPublishMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });

  it('should return an error as extensions do not contain required fields', () => {
    const TxMAEvent: TxMAEvent = {
      timestamp: 87_298_174,
      user: { user_id: 'USERID' },
      event_name: 'TICF_ACCOUNT_INTERVENTION',
      extensions: { },
    };
    expect(() => validateEvent(TxMAEvent)).toThrow(new ValidationError('Invalid intervention event.'));
    expect(logger.debug).toHaveBeenCalledWith('Sensitive info - Event has failed schema validation.', { validationErrors: expect.anything() });
    expect(logAndPublishMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });

  it('should return an error as intervention code is NAN', () => {
    const TxMAEvent: TxMAEvent = {
      timestamp: 87_298_174,
      user: {
        user_id: 'abc'
      },
      event_name: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
      extensions: {
        intervention: {
          intervention_code: 'nan',
          intervention_reason: 'reason',
        },
      },
    };
    expect(validateEvent(TxMAEvent)).toBeUndefined();
    expect(() => validateInterventionEvent(TxMAEvent)).toThrow(new ValidationError('Invalid intervention event.'));
    expect(logger.debug).toHaveBeenCalledWith('Invalid intervention request. Intervention code is NAN');
    expect(logAndPublishMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });
});
