import { StateDetails, TxMAIngressEvent } from '../data-types/interfaces';
import { UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { getCurrentTimestamp } from './get-current-timestamp';
import { AISInterventionTypes, EventsEnum, MetricNames, SEPARATOR } from '../data-types/constants';
import { logAndPublishMetric } from './metrics';

/**
 * Method to build a Partial of UpdateItemCommandInput
 * @param newState - new account state object
 * @param eventName - the name of the event received
 * @param eventTimestamp - timestamp of received event
 * @param currentTimestamp - timestamp of now
 * @param interventionName - optional intervention name if the event was a fraud intervention
 * @param interventionEvent
 */
export const buildPartialUpdateAccountStateCommand = (
  newState: StateDetails,
  eventName: EventsEnum,
  eventTimestamp: number,
  currentTimestamp: number,
  interventionEvent: TxMAIngressEvent,
  interventionName?: AISInterventionTypes,
): Partial<UpdateItemCommandInput> => {
  const currentTime = getCurrentTimestamp();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseUpdateItemCommandInput: Record<string, any> = {
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
      ':ua': { N: `${currentTime.milliseconds}` },
    },
    UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua',
  };
  if (eventName === EventsEnum.IPV_IDENTITY_ISSUED) {
    baseUpdateItemCommandInput['ExpressionAttributeNames']['#RIdA'] = 'reprovedIdentityAt';
    baseUpdateItemCommandInput['ExpressionAttributeValues'][':rida'] = { N: `${eventTimestamp}` };
    baseUpdateItemCommandInput['UpdateExpression'] += ', #RIdA = :rida';
  } else if (eventName === EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL) {
    baseUpdateItemCommandInput['ExpressionAttributeNames']['#RPswdA'] = 'resetPasswordAt';
    baseUpdateItemCommandInput['ExpressionAttributeValues'][':rpswda'] = { N: `${eventTimestamp}` };
    baseUpdateItemCommandInput['UpdateExpression'] += ', #RPswdA = :rpswda';
  } else {
    if (!interventionName) {
      logAndPublishMetric(MetricNames.INTERVENTION_DID_NOT_HAVE_NAME_IN_CURRENT_CONFIG);
      throw new Error('The intervention received did not have an interventionName field.');
    }
    baseUpdateItemCommandInput['ExpressionAttributeNames']['#INT'] = 'intervention';
    baseUpdateItemCommandInput['ExpressionAttributeValues'][':int'] = { S: interventionName };
    baseUpdateItemCommandInput['ExpressionAttributeNames']['#AA'] = 'appliedAt';
    baseUpdateItemCommandInput['ExpressionAttributeValues'][':aa'] = { N: `${currentTimestamp}` };
    baseUpdateItemCommandInput['ExpressionAttributeNames']['#SA'] = 'sentAt';
    baseUpdateItemCommandInput['ExpressionAttributeValues'][':sa'] = { N: `${eventTimestamp}` };
    baseUpdateItemCommandInput['ExpressionAttributeNames']['#H'] = 'history';
    baseUpdateItemCommandInput['ExpressionAttributeValues'][':empty_list'] = { L: [] };
    baseUpdateItemCommandInput['ExpressionAttributeValues'][':h'] = {
      L: [{ S: formHistoryString(interventionEvent, eventTimestamp) }],
    };
    baseUpdateItemCommandInput['UpdateExpression'] +=
      ', #INT = :int, #SA = :sa, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)';
  }
  return baseUpdateItemCommandInput;
};

function formHistoryString(event: TxMAIngressEvent, timeStamp: number) {
  const interventionInformation = event.extensions?.intervention;
  return buildHistoryString(
    `${timeStamp}`,
    event.component_id,
    interventionInformation?.intervention_code,
    interventionInformation?.intervention_reason,
    interventionInformation?.originating_component_id,
    interventionInformation?.intervention_predecessor_id,
    interventionInformation?.requester_id,
  );
}
function buildHistoryString(
  event_timestamp_ms = '',
  component_id = '',
  intervention_code = '',
  intervention_reason = '',
  originating_component_id = '',
  intervention_predecessor_id = '',
  requester_id = '',
) {
  return `${event_timestamp_ms}${SEPARATOR}${component_id}${SEPARATOR}${intervention_code}${SEPARATOR}${intervention_reason}${SEPARATOR}${originating_component_id}${SEPARATOR}${intervention_predecessor_id}${SEPARATOR}${requester_id}`;
}
