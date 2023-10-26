import { EventsEnum, AISInterventionTypes } from './constants';

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
  allowedFromStates: EventsEnum[];
}
export interface InterventionEventDetails {
  code: number;
  state: StateDetails;
  allowedTransitions: EventsEnum[];
  interventionName?: AISInterventionTypes;
}

export interface CurrentTimeDescriptor {
  isoString: string;
  milliseconds: number;
  seconds: number;
}

export interface TxMAEvent {
  event_name: string;
  timestamp: number;
  component_id: string;
  user: User;
  extension?: Extension;
}

interface User {
  user_id: string;
}

interface Extension {
  intervention: Intervention;
}

interface Intervention {
  intervention_code: number;
  intervention_reason: string;
  cms_id?: string;
  requester_id?: string;
  audit_level?: string;
}
