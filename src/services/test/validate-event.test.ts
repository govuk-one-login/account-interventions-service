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

  it('should no return anything as event is valid', () => {
    const TxMAEvent: TxMAEvent = {
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
    };
    expect(validateEvent(TxMAEvent)).toBeUndefined();
    expect(validateInterventionEvent(TxMAEvent)).toBeUndefined();
  });

  it('should return error as intervention is invalid', () => {
    const TxMAEvent: TxMAEvent = {
      timestamp: 87_298_174,
      user: {
        user_id: 'abc',
      },
      event_name: 'event',
      extensions: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        intervention: {
          intervention_reason: 'reason',
        },
      },
    };
    expect(() => validateEvent(TxMAEvent)).toThrow(new ValidationError('Invalid intervention event.'));
    expect(logger.debug).toHaveBeenCalledWith('event has failed schema validation');
    expect(logAndPublishMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });

  it('should return error as event is invalid', () => {
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
    expect(logger.debug).toHaveBeenCalledWith('event has failed schema validation');
    expect(logAndPublishMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });

  it('should return error as intervention code is NAN', () => {
    const TxMAEvent: TxMAEvent = {
      timestamp: 87_298_174,
      user: {
        user_id: 'abc'
      },
      event_name: 'event',
      extension: {
        intervention: {
          intervention_code: 'nan',
          intervention_reason: 'reason',
        },
      },
    };
    expect(validateEvent(TxMAEvent)).toBeUndefined();
    expect(() => validateInterventionEvent(TxMAEvent)).toThrow(new ValidationError('Invalid intervention event.'));
    expect(logger.debug).toHaveBeenCalledWith('Invalid intervention request.');
    expect(logAndPublishMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });
});
