import { AIS_EVENT_TRANSITION_APPLIED } from '@govuk-one-login/event-catalogue/AIS_EVENT_TRANSITION_APPLIED';
import { EventsEnum, AISInterventionTypes, PossibleAccountStatus, Codes } from './constants';
import { AIS_EVENT_IGNORED_STALE } from '../events/ais-event-ignored-stale';
import { AIS_EVENT_TRANSITION_IGNORED } from '@govuk-one-login/event-catalogue/AIS_EVENT_TRANSITION_IGNORED';
import { AUTH_DELETE_ACCOUNT } from '@govuk-one-login/event-catalogue/AUTH_DELETE_ACCOUNT';

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
  intervention: string;
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
  | AUTH_DELETE_ACCOUNT;

export interface TxmaUser {
  user_id: string;
}

export interface DeleteStatusUpdateSNSMessage {
  user_id: string;
}

export interface TransitionConfigInterface {
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
