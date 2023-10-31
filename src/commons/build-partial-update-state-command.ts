import { StateDetails } from '../data-types/interfaces';
import { UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { getCurrentTimestamp } from './get-current-timestamp';
import { EventsEnum, MetricNames } from '../data-types/constants';
import { logAndPublishMetric } from './metrics';

/**
 * Method to build a Partial of UpdateItemCommandInput
 * @param newState - new account state object
 * @param eventName - the name of the event received
 * @param interventionName - optional intervention name if the event was a fraud intervention
 */
export const buildPartialUpdateAccountStateCommand = (
  newState: StateDetails,
  eventName: EventsEnum,
  interventionName?: string,
): Partial<UpdateItemCommandInput> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  if (eventName === EventsEnum.IPV_IDENTITY_ISSUED) {
    base['ExpressionAttributeNames']['#RIdA'] = 'reprovedIdentityAt';
    base['ExpressionAttributeValues'][':rida'] = { N: `${getCurrentTimestamp().milliseconds}` };
    base['UpdateExpression'] += ', #RIdA = :rida';
  } else if (eventName === EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL) {
    base['ExpressionAttributeNames']['#RPswdA'] = 'resetPasswordAt';
    base['ExpressionAttributeValues'][':rpswda'] = { N: `${getCurrentTimestamp().milliseconds}` };
    base['UpdateExpression'] += ', #RPswdA = :rpswda';
  } else {
    if (!interventionName) {
      logAndPublishMetric(MetricNames.INTERVENTION_DID_NOT_HAVE_NAME_IN_CURRENT_CONFIG);
      throw new Error('intervention received did not have an interventionName field');
    }
    base['ExpressionAttributeNames']['#INT'] = 'intervention';
    base['ExpressionAttributeValues'][':int'] = { S: interventionName };
    base['ExpressionAttributeNames']['#AA'] = 'appliedAt';
    base['ExpressionAttributeValues'][':aa'] = { N: `${getCurrentTimestamp().milliseconds}` };
    base['ExpressionAttributeNames']['#H'] = 'history';
    base['ExpressionAttributeValues'][':empty_list'] = { L: [] };
    base['ExpressionAttributeValues'][':h'] = { L: [{ S: interventionName }] };
    base['UpdateExpression'] += ', #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)';
  }
  return base;
};
