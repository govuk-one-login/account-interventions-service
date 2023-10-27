import { TxMAEvent } from '../../data-types/interfaces';
import { validateEvent, validateInterventionEvent } from '../validate-event';
import logger from '../../commons/logger';
import { logAndPublishMetric } from '../../commons/metrics';

jest.mock('../../commons/metrics');
jest.mock('@aws-lambda-powertools/logger');
describe('event-validation', () => {
  it('should return true as event is valid', () => {
    const TxMAEvent: TxMAEvent = {
      timestamp: 87_298_174,
      user: {
        user_id: 'abc',
      },
      event_name: 'event',
      extension: {
        intervention: {
          intervention_code: 1,
          intervention_reason: 'reason',
        },
      },
    };
    expect(validateEvent(TxMAEvent)).toEqual(true);
    expect(validateInterventionEvent(TxMAEvent)).toEqual(true);
  });

  it('should return false as intervention is invalid', () => {
    const TxMAEvent: TxMAEvent = {
      timestamp: 87_298_174,
      user: {
        user_id: 'abc',
      },
      event_name: 'event',
      extension: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        intervention: {
          intervention_reason: 'reason',
        },
      },
    };
    expect(validateEvent(TxMAEvent)).toEqual(true);
    expect(validateInterventionEvent(TxMAEvent)).toEqual(false);
    expect(logger.debug).toHaveBeenCalledWith('Invalid intervention request.');
    expect(logAndPublishMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });

  it('should return false as event is invalid', () => {
    const TxMAEvent: TxMAEvent = {
      timestamp: 87_298_174,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      user: {},
      event_name: 'event',
      extension: {
        intervention: {
          intervention_code: 1,
          intervention_reason: 'reason',
        },
      },
    };
    expect(validateEvent(TxMAEvent)).toEqual(false);
    expect(validateInterventionEvent(TxMAEvent)).toEqual(true);
    expect(logger.debug).toHaveBeenCalledWith('event event did not have user id field');
    expect(logAndPublishMetric).toHaveBeenCalledWith('INVALID_EVENT_RECEIVED');
  });
});
