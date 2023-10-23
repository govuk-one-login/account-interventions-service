import { StateDetails } from './interfaces';
import { UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';

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

export const buildPartialUpdateAccountStateCommand = (
  newState: StateDetails,
  eventName: AccountStateEventEnum,
  interventionName?: string,
): Partial<UpdateItemCommandInput> => {
  const base: Record<string, any> = {
    // this is inefficient, cause we update everything even though just one field may differ from current
    ExpressionAttributeNames: {
      '#B': 'blocked',
      '#S': 'suspended',
      '#RP': 'resetPassword',
      '#RI': 'reproveIdentity',
      '#UA': 'updatedAt',
    }, //can we maybe always include all the attribute names for all columns as a default?
    ExpressionAttributeValues: {
      ':b': { BOOL: newState.blocked },
      ':s': { BOOL: newState.suspended },
      ':rp': { BOOL: newState.resetPassword },
      ':ri': { BOOL: newState.reproveIdentity },
      ':ua': { N: `${getCurrentTimestamp().milliseconds}` },
    },
    UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua',
  };
  if (eventName === AccountStateEventEnum.IPV_IDENTITY_ISSUED) {
    base['ExpressionAttributeNames']['#RIdA'] = 'reprovedIdentityAt';
    base['ExpressionAttributeValues'][':rida'] = { N: `${getCurrentTimestamp().milliseconds}` };
    base['UpdateExpression'] += ', #RIdA = :rida';
  } else if (eventName === AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL) {
    base['ExpressionAttributeNames']['#RPswdA'] = 'resetPasswordAt';
    base['ExpressionAttributeValues'][':rpswda'] = { N: `${getCurrentTimestamp().milliseconds}` };
    base['UpdateExpression'] += ', #RPswdA = :rpswda';
  } else {
    if (interventionName) {
      base['ExpressionAttributeNames']['#INT'] = 'intervention';
      base['ExpressionAttributeValues'][':int'] = { S: interventionName };
      base['ExpressionAttributeNames']['#AA'] = 'appliedAt';
      base['ExpressionAttributeValues'][':aa'] = { N: `${getCurrentTimestamp().milliseconds}` };
      base['ExpressionAttributeNames']['#H'] = 'history';
      base['ExpressionAttributeValues'][':empty_list'] = { L: [] };
      base['ExpressionAttributeValues'][':h'] = { L: [{ S: 'some history' }] };
      base['UpdateExpression'] += ', #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)';
    } else throw new Error('intervention received did not have an interventionName field');
  }
  return base;
};
