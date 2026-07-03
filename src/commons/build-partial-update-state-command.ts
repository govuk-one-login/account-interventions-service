import { StateDetails } from '../data-types/interfaces';
import { AISInterventionTypes, EventsEnum, MetricNames } from '../data-types/constants';
import { addMetric } from './metrics';
import { HistoryStringBuilder } from './history-string-builder';
import { AppConfigService } from '../services/app-config-service';
import { InterventionEventMessage } from '../contracts/intervention-events';
import { AccountStatus } from '../tables/account-status';

/**
 * Method to build a Partial of UpdateItemCommandInput
 * @param finalState - new account state object
 * @param eventName - the name of the event received
 * @param currentTimestamp - timestamp of now in ms
 * @param interventionEvent - intervention type
 * @param interventionName - optional intervention name if the event was a fraud intervention
 * @param historyList - list of history items
 */
export function buildPartialUpdateAccountStateCommand(
  finalState: StateDetails,
  currentTimestamp: number,
  interventionEvent: InterventionEventMessage,
  historyList: string[],
  interventionName?: AISInterventionTypes,
): { input: Partial<AccountStatus>; keysToRemove?: (keyof AccountStatus)[] } {
  const eventTimestamp = interventionEvent.event_timestamp_ms;

  const baseUpdateItemCommandInput: Partial<AccountStatus> = {
    blocked: finalState.blocked,
    suspended: finalState.suspended,
    resetPassword: finalState.resetPassword,
    reproveIdentity: finalState.reproveIdentity,
    updatedAt: currentTimestamp,
  };

  if (interventionEvent.event_name === EventsEnum.IPV_ACCOUNT_INTERVENTION_END) {
    return {
      input: {
        ...baseUpdateItemCommandInput,
        reprovedIdentityAt: eventTimestamp,
        history: extractValidHistoryItems(historyList, currentTimestamp),
      },
    };
  }

  if (
    interventionEvent.event_name === EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL ||
    interventionEvent.event_name === EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT
  ) {
    return {
      input: {
        ...baseUpdateItemCommandInput,
        resetPasswordAt: eventTimestamp,
        history: extractValidHistoryItems(historyList, currentTimestamp),
      },
    };
  }

  if (!interventionName) {
    addMetric(MetricNames.INTERVENTION_DID_NOT_HAVE_NAME_IN_CURRENT_CONFIG);
    throw new Error('The intervention received did not have an interventionName field.');
  }

  const stringBuilder = new HistoryStringBuilder();

  return {
    input: {
      ...baseUpdateItemCommandInput,
      intervention: interventionName,
      appliedAt: currentTimestamp,
      sentAt: eventTimestamp,
      history: [
        ...extractValidHistoryItems(historyList, currentTimestamp),
        stringBuilder.getHistoryString(interventionEvent, eventTimestamp),
      ],
    },
    keysToRemove: keysToRemove(finalState),
  };
}

/**
 * Helper function to build the Remove Expression for DynamoDB update
 * @param finalState - new account state object
 */
function keysToRemove(finalState: StateDetails): (keyof AccountStatus)[] {
  const itemsToRemove: (keyof AccountStatus)[] = [];

  if (finalState.resetPassword) {
    itemsToRemove.push('resetPasswordAt');
  }
  if (finalState.reproveIdentity) {
    itemsToRemove.push('reprovedIdentityAt');
  }

  return itemsToRemove;
}

/**
 * Helper function to determine which history items have not exceeded the retention period.
 * @param historyList - list of history items
 * @param currentTimestampMs - current timestamp in milliseconds
 */
function extractValidHistoryItems(historyList: string[], currentTimestampMs: number) {
  const historyStringBuilder = new HistoryStringBuilder();

  return historyList.reduce((validHistoryItems: string[], historyItem: string) => {
    const historyObject = historyStringBuilder.getHistoryObject(historyItem);
    const sendAtMs = new Date(historyObject.sentAt).getTime();
    if (sendAtMs + AppConfigService.getInstance().historyRetentionSeconds * 1000 >= currentTimestampMs) {
      validHistoryItems.push(historyItem);
    }

    return validHistoryItems;
  }, []);
}
