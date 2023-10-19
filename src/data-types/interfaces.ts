import { AccountStateEventEnum, AISInterventionTypes } from './constants';

export interface StateDetails {
  blocked: boolean;
  suspended: boolean;
  resetPassword: boolean;
  reproveIdentity: boolean;
}

export interface TransitionConfiguration {
  [key: string]: EventDetails;
}

export interface EventDetails {
  code: number;
  state: StateDetails;
  allowedTransitions: AccountStateEventEnum[];
  interventionName?: AISInterventionTypes;
}

export interface CurrentTimeDescriptor {
  isoString: string;
  milliseconds: number;
  seconds: number;
}
