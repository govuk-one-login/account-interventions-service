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

export interface InterventionRequest {
  event_name: string;
  timestamp: number;
  component_id: string;
  user: User;
  extension: Extension;
}

interface User {
  user_id: string;
}

interface Extension {
  intervention: Intervention;
}

interface Intervention {
  intervention_code: string;
  intervention_reason: string;
  cms_id?: string;
  requester_id?: string;
  audit_level?: string;
}
