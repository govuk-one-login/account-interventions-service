import { EventsEnum, AISInterventionTypes } from './constants';

export interface StateDetails {
  blocked: boolean;
  suspended: boolean;
  resetPassword: boolean;
  reproveIdentity: boolean;
}

export interface DynamoDBStateResult extends StateDetails {
  sentAt?: number;
  appliedAt?: number;
  isAccountDeleted?: boolean;
}

export interface FullAccountInformation {
  blocked: boolean;
  suspended: boolean;
  resetPassword: boolean;
  reproveIdentity: boolean;
  sentAt: number;
  appliedAt: number;
  isAccountDeleted?: boolean;
  history: string[];
  intervention: string;
  updatedAt: number;
  reprovedIdentityAt?: number;
  resetPasswordAt?: number;
  auditLevel?: string;
}
export interface AccountStateEngineOutput {
  newState: StateDetails;
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
  | 'AIS_INTERVENTION_IGNORED_IN_FUTURE'
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
  appliedAt: number | undefined;
  reason: string | undefined;
}
export interface TxMAIngressEvent {
  event_name: string;
  timestamp: number;
  event_timestamp_ms?: number;
  component_id: string;
  user: TxmaUser;
  extensions?: IngressEventExtension;
}

export interface TxmaUser {
  user_id: string;
}

interface IngressEventExtension {
  intervention?: Intervention;
  levelOfConfidence?: string;
  ciFail?: boolean;
  hasMitigations?: boolean;
}

interface Intervention {
  intervention_code: string;
  intervention_reason: string;
  requester_id?: string;
  originating_component_id?: string;
  originator_reference_id?: string;
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

export interface AccountStatus {
  updatedAt: number;
  appliedAt: number;
  sentAt: number;
  description: string;
  reprovedIdentityAt: number | undefined;
  resetPasswordAt: number | undefined;
  state: {
    blocked: boolean;
    suspended: boolean;
    reproveIdentity: boolean;
    resetPassword: boolean;
  };
  auditLevel: string;
  history?: HistoryObject[];
}

export interface History {
  sentAt: string;
  component: string;
  code: string;
  intervention: string;
  reason: string;
  originatingComponent?: string;
  originatorReferenceId?: string;
  requesterId?: string;
}

export interface HistoryObject {
  sentAt: string;
  component: string;
  code: string;
  intervention: string;
  reason: string;
  originatingComponent: string | undefined;
  originatorReferenceId: string | undefined;
  requesterId: string | undefined;
}
