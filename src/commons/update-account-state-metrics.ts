import { StateDetails } from '../data-types/interfaces';
import { logAndPublishMetric } from './metrics';
import { MetricNames, noMetadata } from '../data-types/constants';

/**
 * Function that compares the old account state and new account state and increments/decrements count of accounts blocked AND/OR accounts suspended accordingly
 * @param oldState - the StateDetails representation of the user account's state before the applied event
 * @param newState - the StateDetails representation of the user account's state after the applied event
 */
export function updateAccountStateCountMetric(oldState: StateDetails, newState: StateDetails) {
  const blockedChange = (Number(oldState.blocked) - Number(newState.blocked)) * -1;
  if (blockedChange !== 0) logAndPublishMetric(MetricNames.ACCOUNTS_BLOCKED, noMetadata, blockedChange);
  const suspendChange = (Number(oldState.suspended) - Number(newState.suspended)) * -1;
  if (suspendChange !== 0) logAndPublishMetric(MetricNames.ACCOUNTS_SUSPENDED, noMetadata, suspendChange);
}

/**
 * Function that inspects the account information and decrements the appropriate count in response to the account being deleted
 * @param blocked - boolean flag tracking if account is blocked
 * @param suspended - boolean flag tracking if account is suspended
 */
export function updateAccountStateCountMetricAfterDeletion(blocked: boolean, suspended: boolean) {
  if (blocked) logAndPublishMetric(MetricNames.ACCOUNTS_BLOCKED, noMetadata, -1);
  else if (suspended) logAndPublishMetric(MetricNames.ACCOUNTS_SUSPENDED, noMetadata, -1);
}
