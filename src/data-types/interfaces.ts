import { AccountStateEventEnum, AISInterventionTypes } from './constants';

export interface StateDetails {
  blocked: boolean;
  suspended: boolean;
  resetPassword: boolean;
  reproveIdentity: boolean;
}

export interface InterventionTransitionConfigurations {
  [key: string]: InterventionEventDetails;
}

export interface UserLedActionTransitionConfigurations {
  [key: string]: UserLedActionEventDetails;
}
export interface UserLedActionEventDetails {
  code: number;
  state: { resetPassword?: boolean; reproveIdentity?: boolean };
  allowedFromStates: AccountStateEventEnum[];
}
export interface InterventionEventDetails {
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
