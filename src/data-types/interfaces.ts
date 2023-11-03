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

export type TxMAEgressEventName =
  | 'AIS_INTERVENTION_TRANSITION_APPLIED'
  | 'AIS_INTERVENTION_TRANSITION_IGNORED'
  | 'AIS_INTERVENTION_IGNORED_STALE'
  | 'AIS_INTERVENTION_IGNORED_INFUTURE'
  | 'AIS_INTERVENTION_IGNORED_ACCOUNT_DELETED';

export interface TxMAEgressEvent {
  event_name: TxMAEgressEventName;
  timestamp: number;
  event_timestamp_ms?: number;
  event_timestamp_ms_formatted?: string;
  component_id?: string;
  user: TxmaUser;
  extensions: TxMAEgressExtensions;
}

export interface TxMAEgressExtensions {
  intervention: EventsEnum;
  appliedAt?: number;
  reason?: string;
}
export interface TxMAIngressEvent {
  event_name: string;
  timestamp: number;
  event_timestamp_ms?: number;
  component_id?: string;
  user: TxmaUser;
  extension?: IngressEventExtension;
}

export interface TxmaUser {
  user_id: string;
}

interface IngressEventExtension {
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
