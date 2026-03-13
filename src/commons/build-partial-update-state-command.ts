import { StateDetails, TxMAIngressEvent } from '../data-types/interfaces';
import { UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { AISInterventionTypes, EventsEnum, MetricNames } from '../data-types/constants';
import { addMetric } from './metrics';
import { HistoryStringBuilder } from './history-string-builder';
import { AppConfigService } from '../services/app-config-service';

/**
 * Method to build a Partial of UpdateItemCommandInput
 * @param finalState - new account state object
 * @param eventName - the name of the event received
 * @param currentTimestamp - timestamp of now in ms
 * @param interventionEvent - intervention type
 * @param interventionName - optional intervention name if the event was a fraud intervention
 * @param historyList - list of history items
 */
export const buildPartialUpdateAccountStateCommand = (
  finalState: StateDetails,
  eventName: EventsEnum,
  currentTimestamp: number,
  interventionEvent: TxMAIngressEvent,
  historyList: string[],
  interventionName?: AISInterventionTypes,
): Partial<UpdateItemCommandInput> => {
  const eventTimestamp = interventionEvent.event_timestamp_ms ?? interventionEvent.timestamp * 1000;

  const expressionAttributeNames: UpdateItemCommandInput['ExpressionAttributeNames'] = {
    '#B': 'blocked',
    '#S': 'suspended',
    '#RP': 'resetPassword',
    '#RI': 'reproveIdentity',
    '#UA': 'updatedAt',
  };
  const expressionAttributeValues: UpdateItemCommandInput['ExpressionAttributeValues'] = {
    ':b': { BOOL: finalState.blocked },
    ':s': { BOOL: finalState.suspended },
    ':rp': { BOOL: finalState.resetPassword },
    ':ri': { BOOL: finalState.reproveIdentity },
    ':ua': { N: String(currentTimestamp) },
  };

  let updateExpression = 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua';

  if (eventName === EventsEnum.IPV_ACCOUNT_INTERVENTION_END) {
    expressionAttributeNames['#RIdA'] = 'reprovedIdentityAt';
    expressionAttributeValues[':rida'] = { N: String(eventTimestamp) };
    expressionAttributeNames['#H'] = 'history';
    expressionAttributeValues[':h'] = {
      L: extractValidHistoryItems(historyList, currentTimestamp),
    };
    updateExpression += ', #RIdA = :rida, #H = :h';
    return {
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      UpdateExpression: updateExpression,
    };
  }
  if (
    eventName === EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL ||
    eventName === EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT
  ) {
    expressionAttributeNames['#RPswdA'] = 'resetPasswordAt';
    expressionAttributeValues[':rpswda'] = { N: String(eventTimestamp) };
    expressionAttributeNames['#H'] = 'history';
    expressionAttributeValues[':h'] = {
      L: extractValidHistoryItems(historyList, currentTimestamp),
    };
    updateExpression += ', #RPswdA = :rpswda, #H = :h';
    return {
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      UpdateExpression: updateExpression,
    };
  }
  if (!interventionName) {
    addMetric(MetricNames.INTERVENTION_DID_NOT_HAVE_NAME_IN_CURRENT_CONFIG);
    throw new Error('The intervention received did not have an interventionName field.');
  }
  expressionAttributeNames['#INT'] = 'intervention';
  expressionAttributeValues[':int'] = { S: interventionName };
  expressionAttributeNames['#AA'] = 'appliedAt';
  expressionAttributeValues[':aa'] = { N: String(currentTimestamp) };
  expressionAttributeNames['#SA'] = 'sentAt';
  expressionAttributeValues[':sa'] = { N: String(eventTimestamp) };
  const stringBuilder = new HistoryStringBuilder();
  expressionAttributeNames['#H'] = 'history';
  expressionAttributeValues[':h'] = {
    L: [
      ...extractValidHistoryItems(historyList, currentTimestamp),
      { S: stringBuilder.getHistoryString(interventionEvent, eventTimestamp) },
    ],
  };
  updateExpression += ', #INT = :int, #SA = :sa, #AA = :aa, #H = :h';
  updateExpression += buildRemoveExpression(finalState);

  return {
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    UpdateExpression: updateExpression,
  };
};

/**
 * Helper function to build the Remove Expression for DynamoDB update
 * @param finalState - new account state object
 */
function buildRemoveExpression(finalState: StateDetails) {
  const itemsToRemove = [];

  if (finalState.resetPassword) {
    itemsToRemove.push('resetPasswordAt');
  }
  if (finalState.reproveIdentity) {
    itemsToRemove.push('reprovedIdentityAt');
  }

  if (itemsToRemove.length === 0) {
    return '';
  }

  return ' REMOVE ' + itemsToRemove.join(', ');
}

/**
 * Helper function to determine which history items have not exceeded the retention period.
 * @param historyList - list of history items
 * @param currentTimestampMs - current timestamp in milliseconds
 */
function extractValidHistoryItems(historyList: string[], currentTimestampMs: number) {
  const historyStringBuilder = new HistoryStringBuilder();

  return historyList.reduce((validHistoryItems: { S: string }[], historyItem: string) => {
    const historyObject = historyStringBuilder.getHistoryObject(historyItem);
    const sendAtMs = new Date(historyObject.sentAt).getTime();
    if (sendAtMs + AppConfigService.getInstance().historyRetentionSeconds * 1000 >= currentTimestampMs) {
      validHistoryItems.push({ S: historyItem });
    }

    return validHistoryItems;
  }, []);
}
