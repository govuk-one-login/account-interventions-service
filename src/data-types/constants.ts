export const LOGS_PREFIX_SENSITIVE_INFO = 'Sensitive info -';
export const LOGS_PREFIX_INVALID_CONFIG = 'Invalid configuration -';

export enum MetricNames {
  DB_DELETE_ERROR_NO_RESPONSE = 'DB_DELETE_ERROR_NO_RESPONSE',
  DB_QUERY_HAS_LEK = 'DB_QUERY_HAS_LEK',
  DB_QUERY_ERROR_NO_RESPONSE = 'DB_QUERY_ERROR_NO_RESPONSE',
}

//enum with the names of all events we may receive (fraud intervention  + user actions)?
export enum AccountStateEventEnum {
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
  AIS_NO_INTERVENTION = 'AIS_NO_INTERVENTION', //I do not think this will ever be in the table as a value
  AIS_ACCOUNT_SUSPENDED = 'AIS_ACCOUNT_SUSPENDED',
  AIS_ACCOUNT_UNSUSPENDED = 'AIS_ACCOUNT_UNSUSPENDED',
  AIS_ACCOUNT_BLOCKED = 'AIS_ACCOUNT_BLOCKED',
  AIS_ACCOUNT_UNBLOCKED = 'AIS_ACCOUNT_UNBLOCKED',
  AIS_FORCE_USER_PASSWORD_RESET = 'AIS_USER_PASSWORD_RESET', //pragma: allowlist secret
  AIS_FORCED_USER_IDENTITY_VERIFY = 'AIS_USER_IDENTITY_VERIFIED',
  AIS_FORCE_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY = 'AIS_USER_PASSWORD_RESET_AND_IDENTITY_VERIFIED', //pragma: allowlist secret
}
