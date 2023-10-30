import { TxMAEvent } from '../../data-types/interfaces';
import { validateEvent, validateInterventionEvent } from '../validate-event';

export const checkEvents = (event: TxMAEvent) => {
  validateInterventionEvent(event);
  validateEvent(event);
};
