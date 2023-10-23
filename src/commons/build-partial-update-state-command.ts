import { StateDetails } from '../data-types/interfaces';
import { UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { getCurrentTimestamp } from './get-current-timestamp';
import { AccountStateEventEnum } from '../data-types/constants';

export const buildPartialUpdateAccountStateCommand = (
  newState: StateDetails,
  eventName: AccountStateEventEnum,
  interventionName?: string,
): Partial<UpdateItemCommandInput> => {
  const base: Record<string, any> = {
    ExpressionAttributeNames: {
      '#B': 'blocked',
      '#S': 'suspended',
      '#RP': 'resetPassword',
      '#RI': 'reproveIdentity',
      '#UA': 'updatedAt',
    },
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
      base['ExpressionAttributeValues'][':h'] = { L: [{ S: interventionName }] };
      base['UpdateExpression'] += ', #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)';
    } else throw new Error('intervention received did not have an interventionName field');
  }
  return base;
};
