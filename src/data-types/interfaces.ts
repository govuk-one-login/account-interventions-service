import {
  AIS_EVENT_TRANSITION_APPLIED,
  InterventionCodeEnum1,
} from '@govuk-one-login/event-catalogue/AIS_EVENT_TRANSITION_APPLIED';
import { EventsEnum, AISInterventionTypes, TriggerEventsEnum, PossibleAccountStatus, Codes } from './constants';
import { AIS_EVENT_IGNORED_STALE } from '../events/ais-event-ignored-stale';
import { AIS_EVENT_TRANSITION_IGNORED } from '@govuk-one-login/event-catalogue/AIS_EVENT_TRANSITION_IGNORED';

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
  interventionName: AISInterventionTypes | undefined;
  nextAllowableInterventions: Codes[];
}

export interface CurrentTimeDescriptor {
  isoString: string;
  milliseconds: number;
  seconds: number;
}

export type TxMAEgressInterventionEventName =
  | 'AIS_EVENT_TRANSITION_APPLIED'
  | 'AIS_EVENT_TRANSITION_IGNORED'
  | 'AIS_EVENT_IGNORED_STALE'
  | 'AIS_EVENT_IGNORED_IN_FUTURE'
  | 'AIS_EVENT_IGNORED_ACCOUNT_DELETED';

export type TxMAEgressEvent =
  | AIS_EVENT_TRANSITION_APPLIED
  | AIS_EVENT_TRANSITION_IGNORED
  | AIS_EVENT_IGNORED_STALE
  | TxMAEgressDeletionEvent; // Should be AUTH_DELETE_ACCOUNT;

export interface TxMAEgressDeletionEvent {
  event_name: 'AUTH_DELETE_ACCOUNT';
  user_id: string;
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
  type?: string;
  success?: boolean;
}

interface Intervention {
  intervention_code: InterventionCodeEnum1;
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
  nodes: Record<PossibleAccountStatus, StateDetails>;
  edges: Record<
    Codes,
    {
      to: PossibleAccountStatus;
      name: EventsEnum;
      interventionName?: AISInterventionTypes;
    }
  >;
  adjacency: Record<PossibleAccountStatus, Codes[] | undefined>;
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
