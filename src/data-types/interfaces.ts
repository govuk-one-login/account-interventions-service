import { EventsEnum, AISInterventionTypes, TriggerEventsEnum, ActiveStateActions, State } from './constants';

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
  history: string[];
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
  deletedAt?: number;
  auditLevel?: string;
}
export interface AccountStateEngineOutput {
  stateResult: StateDetails;
  interventionName?: AISInterventionTypes;
  nextAllowableInterventions: string[];
}

export interface CurrentTimeDescriptor {
  isoString: string;
  milliseconds: number;
  seconds: number;
}

export enum TxMAEgressEventName {
  AIS_EVENT_TRANSITION_APPLIED = 'AIS_EVENT_TRANSITION_APPLIED',
  AIS_EVENT_TRANSITION_IGNORED = 'AIS_EVENT_TRANSITION_IGNORED',
  AIS_EVENT_IGNORED_STALE = 'AIS_EVENT_IGNORED_STALE',
  AIS_EVENT_IGNORED_IN_FUTURE = 'AIS_EVENT_IGNORED_IN_FUTURE',
  AIS_EVENT_IGNORED_ACCOUNT_DELETED = 'AIS_EVENT_IGNORED_ACCOUNT_DELETED',
  AIS_NON_FRAUD_EVENT_TRANSITION_APPLIED = 'AIS_NON_FRAUD_EVENT_TRANSITION_APPLIED',
  AIS_NON_FRAUD_EVENT_TRANSITION_IGNORED = 'AIS_NON_FRAUD_EVENT_TRANSITION_IGNORED',
  AIS_NON_FRAUD_EVENT_IGNORED_STALE = 'AIS_NON_FRAUD_EVENT_IGNORED_STALE',
  AIS_NON_FRAUD_EVENT_IGNORED_IN_FUTURE = 'AIS_NON_FRAUD_EVENT_IGNORED_IN_FUTURE',
  AIS_NON_FRAUD_EVENT_IGNORED_ACCOUNT_DELETED = 'AIS_NON_FRAUD_EVENT_IGNORED_ACCOUNT_DELETED',
}

export enum TxMAEgressEventTransitionType {
  TRANSITION_APPLIED = 'TRANSITION_APPLIED',
  TRANSITION_IGNORED = 'TRANSITION_IGNORED',
  IGNORED_STALE = 'IGNORED_STALE',
  IGNORED_IN_FUTURE = 'IGNORED_IN_FUTURE',
  IGNORED_ACCOUNT_DELETED = 'IGNORED_ACCOUNT_DELETED',
}

export interface TxMAEgressEvent {
  event_name: TxMAEgressEventName;
  timestamp: number;
  event_timestamp_ms?: number;
  event_timestamp_ms_formatted?: string;
  component_id?: string;
  user: TxmaUser;
  extensions: TxMAEgressExtensions | TxMAEgressBasicExtensions;
}

export interface TxMAEgressExtensions extends TxMAEgressBasicExtensions {
  description: string | AISInterventionTypes;
  allowable_interventions: string[];
  state: State | undefined;
  action: ActiveStateActions | undefined;
}
export interface TxMAEgressBasicExtensions {
  trigger_event_id: string;
  trigger_event: string;
  intervention_code?: string;
  [key: string | number]: unknown;
}
export interface TxMAIngressEvent {
  event_name: TriggerEventsEnum;
  event_id: string | undefined;
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
  [key: string | number]: unknown;
}

export interface DeleteStatusUpdateSNSMessage {
  user_id: string;
}

export interface TransitionConfigurationInterface {
  nodes: {
    [key: string]: StateDetails;
  };
  edges: {
    [key: string]: {
      to: string;
      name: EventsEnum;
      interventionName?: AISInterventionTypes;
    };
  };
  adjacency: {
    [key: string]: string[];
  };
}

export interface AccountStatus {
  intervention: {
    updatedAt: number;
    appliedAt: number;
    sentAt: number;
    description: string;
    reprovedIdentityAt: number | undefined;
    resetPasswordAt: number | undefined;
    accountDeletedAt: number | undefined;
  };
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
