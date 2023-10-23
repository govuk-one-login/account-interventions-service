export const LOGS_PREFIX_SENSITIVE_INFO = 'Sensitive info -';
export const LOGS_PREFIX_INVALID_CONFIG = 'Invalid configuration -';

export enum MetricNames {
  DB_QUERY_ERROR_NO_RESPONSE = 'DB_QUERY_ERROR_NO_RESPONSE',
  INVALID_SUBJECT_ID = 'INVALID_SUBJECT_ID',
  DB_QUERY_ERROR_TOO_MANY_ITEMS = 'DB_QUERY_ERROR_TOO_MANY_ITEMS',
  ACCOUNT_IS_MARKED_AS_DELETED = 'ACCOUNT_IS_MARKED_AS_DELETED',
  INTERVENTION_EVENT_INVALID = 'INTERVENTION_EVENT_INVALID',
  INVALID_EVENT_RECEIVED = 'INVALID_EVENT_RECEIVED',
  INTERVENTION_IGNORED_IN_FUTURE = 'INTERVENTION_IGNORED_IN_FUTURE',
  STATE_TRANSITION_NOT_ALLOWED_OR_IGNORED = 'STATE_TRANSITION_NOT_ALLOWED_OR_IGNORED',
  INTERVENTION_CODE_NOT_FOUND_IN_CONFIG = 'INTERVENTION_CODE_NOT_FOUND_IN_CONFIG',
  STATE_NOT_FOUND_IN_CURRENT_CONFIG = 'STATE_NOT_FOUND_IN_CURRENT_CONFIG',
  TRANSITION_SAME_AS_CURRENT_STATE = 'TRANSITION_SAME_AS_CURRENT_STATE',
  INTERVENTION_DID_NOT_HAVE_NAME_IN_CURRENT_CONFIG = 'INTERVENTION_DID_NOT_HAVE_NAME_IN_CURRENT_CONFIG',
  NO_TRANSITIONS_FOUND_IN_CONFIG = 'NO_TRANSITIONS_FOUND_IN_CONFIG',
  INVALID_STATE_ENGINE_CONFIGURATION = 'INVALID_STATE_ENGINE_CONFIGURATION',
  DB_UPDATE_ERROR = 'DB_UPDATE_ERROR',
  MARK_AS_DELETED_SUCCEEDED = 'MARK_AS_DELETED_SUCCEEDED',
  MARK_AS_DELETED_FAILED = 'MARK_AS_DELETED_FAILED',
}

export enum EventsEnum {
  NO_EXISTING_INTERVENTIONS = 'NO_EXISTING_INTERVENTIONS',
  FRAUD_SUSPEND_ACCOUNT = 'FRAUD_SUSPEND_ACCOUNT',
  FRAUD_UNSUSPEND_ACCOUNT = 'FRAUD_UNSUSPEND_ACCOUNT',
  FRAUD_BLOCK_ACCOUNT = 'FRAUD_BLOCK_ACCOUNT',
  FRAUD_UNBLOCK_ACCOUNT = 'FRAUD_UNBLOCK_ACCOUNT',
  FRAUD_FORCED_USER_PASSWORD_RESET = 'FRAUD_FORCED_USER_PASSWORD_RESET', //pragma: allowlist secret
  FRAUD_FORCED_USER_IDENTITY_REVERIFICATION = 'FRAUD_FORCED_USER_IDENTITY_REVERIFICATION',
  FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION = 'FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION', //pragma: allowlist secret
  IPV_IDENTITY_ISSUED = 'IPV_IDENTITY_ISSUED',
  AUTH_PASSWORD_RESET_SUCCESSFUL = 'AUTH_PASSWORD_RESET_SUCCESSFUL', //pragma: allowlist secret
}
export enum AISInterventionTypes {
  AIS_NO_INTERVENTION = 'AIS_NO_INTERVENTION',
  AIS_ACCOUNT_SUSPENDED = 'AIS_ACCOUNT_SUSPENDED',
  AIS_ACCOUNT_UNSUSPENDED = 'AIS_ACCOUNT_UNSUSPENDED',
  AIS_ACCOUNT_BLOCKED = 'AIS_ACCOUNT_BLOCKED',
  AIS_ACCOUNT_UNBLOCKED = 'AIS_ACCOUNT_UNBLOCKED',
  AIS_FORCED_USER_PASSWORD_RESET = 'AIS_FORCED_USER_PASSWORD_RESET', //pragma: allowlist secret
  AIS_FORCED_USER_IDENTITY_VERIFY = 'AIS_FORCED_USER_IDENTITY_VERIFY',
  AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY = 'AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY', //pragma: allowlist secret
}
export const TICF_ACCOUNT_INTERVENTION = 'TICF_ACCOUNT_INTERVENTION';
