import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import logger from '../commons/logger';
import { InterventionEventMessage } from '../contracts/intervention-events';
import { EventsEnum, InterventionState, LOGS_PREFIX_SENSITIVE_INFO } from '../data-types/constants';
import { StateDetails } from '../data-types/interfaces';
import { InterventionEvent, InterventionEventsService } from '../tables/intervention-events';
import { randomUUID } from 'node:crypto';
import getActiveInterventions from './active-interventions-service';
import { InterventionName } from '../data-types/intervention-name';
import { AppConfigService } from './app-config-service';

interface InterventionUpdate {
  interventionName: InterventionName;
  interventionState: InterventionState;
}

const appConfig = AppConfigService.getInstance();

/**
 * Generate and append intervention events based on the received txma message
 * @param message - incoming txma message
 * @param event - name of the intervention transition event
 * @param previousState - previous state from the account status table
 * @param interventionEventsService - service to fetch intervention events
 */
async function persistInterventionEvents(
  message: InterventionEventMessage,
  event: EventsEnum,
  previousState: StateDetails | undefined,
  interventionEventsService: InterventionEventsService,
) {
  const updates: InterventionUpdate[] = config[event];

  const activeInterventions = await getActiveInterventions(
    message.user.user_id,
    interventionEventsService,
    previousState,
  );

  const eventsToAppend = generateEventsToAppend(updates, activeInterventions, message);

  logger.debug(`${LOGS_PREFIX_SENSITIVE_INFO} Intervention events to add ${JSON.stringify(eventsToAppend)}`);

  await interventionEventsService.appendEvents(eventsToAppend);

  const closedNames = eventsToAppend
    .filter((event) => event.interventionState !== InterventionState.ACTIVE)
    .map((event) => event.interventionName);
  await setTtlOnInactiveEvents(message.user.user_id, interventionEventsService, closedNames);
}

export async function persistIgnoredInterventionEvent(
  message: InterventionEventMessage,
  event: EventsEnum,
  previousState: StateDetails | undefined,
  interventionEventsService: InterventionEventsService,
) {
  const attemptedInterventions = config[event]
    .filter((u) => u.interventionState === InterventionState.ACTIVE)
    .map((u) => u.interventionName);

  const activeInterventions = await getActiveInterventions(
    message.user.user_id,
    interventionEventsService,
    previousState,
  );

  const updatedIntervention = attemptedInterventions
    .filter((name) => activeInterventions.includes(name))
    .map((name) => ({ interventionName: name, interventionState: InterventionState.IGNORED }));

  const callWith = enrichEvents(updatedIntervention, message);

  await interventionEventsService.appendEvents(callWith);
}

/**
 *
 * @param updates - list of possible updates to apply
 * @param activeInterventions - list of currently active interventions on the account
 * @param message - incoming txma message
 * @returns list of intervention events ready to insert into the database table
 */
export function generateEventsToAppend(
  updates: InterventionUpdate[],
  activeInterventions: InterventionName[],
  message: InterventionEventMessage,
): InterventionEvent[] {
  const events = removeUnnecessaryUpdates(updates, activeInterventions);

  return enrichEvents(events, message);
}

/**
 * Filter list of possible updates to include those which are ACTIVE or where there is a current intervention
 * @param updates - list of possible updates to apply
 * @param activeInterventions - list of currently active interventions on the account
 * @returns updates that should be applied
 */
export const removeUnnecessaryUpdates = (
  updates: InterventionUpdate[],
  activeInterventions: InterventionName[],
): InterventionUpdate[] =>
  updates.filter(
    (update) =>
      update.interventionState === InterventionState.ACTIVE || activeInterventions.includes(update.interventionName),
  );

/**
 * Turn a list of updates into a set of intervention events
 * Sets various fields from the incoming txma message
 * @param updates - list of updates to make
 * @param message - the incoming txma message
 * @returns list of intervention events ready to insert into the database table
 */
export function enrichEvents(updates: InterventionUpdate[], message: InterventionEventMessage): InterventionEvent[] {
  const currentTime = getCurrentTimestamp().milliseconds;
  const transactionId = randomUUID();

  return updates.map((update, index) => {
    const interventionExtension =
      'extensions' in message && 'intervention' in message.extensions ? message.extensions.intervention : undefined;

    return {
      ...update,
      eventId: randomUUID(),
      accountId: message.user.user_id,
      createdAt: currentTime + index,
      interventionReason: interventionExtension?.intervention_reason ?? '',
      sentAt: message.event_timestamp_ms,
      componentId: message.component_id,
      originatingComponentId: interventionExtension?.originating_component_id,
      requesterId: interventionExtension?.requester_id,
      originatorReferenceId: interventionExtension?.originator_reference_id,
      transactionId,
      messageEventId: message.event_id,
    };
  });
}

export async function setTtlOnInactiveEvents(
  accountId: string,
  interventionEventsService: InterventionEventsService,
  closedInterventionNames: InterventionName[],
) {
  const allEvents = await interventionEventsService.fetchEventsForAccount(accountId);
  const now = getCurrentTimestamp();
  const ttl = now.seconds + appConfig.maxRetentionSeconds;

  const eventsNeedingTtl = allEvents.filter(
    (event) => closedInterventionNames.includes(event.interventionName) && !event.ttl,
  );

  if (eventsNeedingTtl.length > 0) {
    const updatedEvents = eventsNeedingTtl.map((event) => ({ ...event, ttl }));
    await interventionEventsService.appendEvents(updatedEvents);
  }
}

/**
 * Dictionary to turn EventsEnum into list of interventions to apply or remove
 */
export const config: Record<EventsEnum, InterventionUpdate[]> = {
  [EventsEnum.FRAUD_SUSPEND_ACCOUNT]: [
    { interventionName: InterventionName.TEMPORARY_SUSPENSION, interventionState: InterventionState.ACTIVE },
    { interventionName: InterventionName.RESET_PASSWORD, interventionState: InterventionState.REMOVED },
    { interventionName: InterventionName.REPROVE_IDENTITY, interventionState: InterventionState.REMOVED },
  ],

  [EventsEnum.FRAUD_BLOCK_ACCOUNT]: [
    { interventionName: InterventionName.PERMANENT_SUSPENSION, interventionState: InterventionState.ACTIVE },
    { interventionName: InterventionName.TEMPORARY_SUSPENSION, interventionState: InterventionState.SUPERSEDED },
    { interventionName: InterventionName.RESET_PASSWORD, interventionState: InterventionState.SUPERSEDED },
    { interventionName: InterventionName.REPROVE_IDENTITY, interventionState: InterventionState.SUPERSEDED },
  ],

  [EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET]: [
    { interventionName: InterventionName.RESET_PASSWORD, interventionState: InterventionState.ACTIVE },
    { interventionName: InterventionName.TEMPORARY_SUSPENSION, interventionState: InterventionState.SUPERSEDED },
    { interventionName: InterventionName.REPROVE_IDENTITY, interventionState: InterventionState.REMOVED },
  ],

  [EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION]: [
    { interventionName: InterventionName.REPROVE_IDENTITY, interventionState: InterventionState.ACTIVE },
    { interventionName: InterventionName.TEMPORARY_SUSPENSION, interventionState: InterventionState.SUPERSEDED },
    { interventionName: InterventionName.RESET_PASSWORD, interventionState: InterventionState.REMOVED },
  ],

  [EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION]: [
    { interventionName: InterventionName.RESET_PASSWORD, interventionState: InterventionState.ACTIVE },
    { interventionName: InterventionName.REPROVE_IDENTITY, interventionState: InterventionState.ACTIVE },
    { interventionName: InterventionName.TEMPORARY_SUSPENSION, interventionState: InterventionState.SUPERSEDED },
  ],

  [EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL]: [
    { interventionName: InterventionName.RESET_PASSWORD, interventionState: InterventionState.MITIGATED },
  ],

  [EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT]: [
    { interventionName: InterventionName.RESET_PASSWORD, interventionState: InterventionState.MITIGATED },
  ],

  [EventsEnum.IPV_ACCOUNT_INTERVENTION_END]: [
    { interventionName: InterventionName.REPROVE_IDENTITY, interventionState: InterventionState.MITIGATED },
  ],

  [EventsEnum.FRAUD_UNSUSPEND_ACCOUNT]: [
    { interventionName: InterventionName.TEMPORARY_SUSPENSION, interventionState: InterventionState.REMOVED },
    { interventionName: InterventionName.RESET_PASSWORD, interventionState: InterventionState.REMOVED },
    { interventionName: InterventionName.REPROVE_IDENTITY, interventionState: InterventionState.REMOVED },
  ],

  [EventsEnum.FRAUD_UNBLOCK_ACCOUNT]: [
    { interventionName: InterventionName.PERMANENT_SUSPENSION, interventionState: InterventionState.REMOVED },
  ],
};

export default persistInterventionEvents;
