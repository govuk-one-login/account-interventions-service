import { EventsEnum, AISInterventionTypes } from './constants';

export interface StateDetails {
  blocked: boolean;
  suspended: boolean;
  resetPassword: boolean;
  reproveIdentity: boolean;
}

export interface DynamoDBStateResult extends StateDetails {
  isAccountDeleted?: boolean;
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
  event_timestamp_ms?: number;
  component_id?: string;
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
  intervention_code: string;
  intervention_reason: string;
  cms_id?: string;
  requester_id?: string;
  audit_level?: string;
}

export interface DeleteStatusUpdateSNSMessage {
  user_id: string;
}

export interface TransitionConfigurationInterface {
  nodes: {
    [key: string]: StateDetails;
  };
  edges: {
    [key: number]: {
      to: string;
      name: EventsEnum;
      interventionName?: AISInterventionTypes;
    };
  };
  adjacency: {
    [key: string]: number[];
  };
}

export interface TransformedResponseFromDynamoDb {
  intervention: {
    updatedAt: number;
    appliedAt: number;
    sentAt: number;
    description: string;
    reprovedIdentityAt: number;
    resetPasswordAt: number;
  state: {
    blocked: boolean;
    suspended: boolean;
    reproveIdentity: boolean;
    resetPassword: boolean;
  };
  auditLevel: string;
}
