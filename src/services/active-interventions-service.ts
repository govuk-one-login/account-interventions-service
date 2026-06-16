import logger from '../commons/logger';
import { LOGS_PREFIX_SENSITIVE_INFO } from '../data-types/constants';
import { StateDetails } from '../data-types/interfaces';
import { InterventionEventsService, InterventionName, InterventionState } from '../tables/intervention-events';

/**
 * Get a list of currently active interventions on an account
 * Gets list from intervention-events table where available and suplements with status from account-status table where required.
 *
 * @param accountId - the id of the user whose account is been intervened on
 * @param interventionEventsService - service to fetch intervention events
 * @param previousState - 4 boolean state from account status table
 */
async function getActiveInterventions(
  accountId: string,
  interventionEventsService: InterventionEventsService,
  previousState: StateDetails | undefined,
): Promise<InterventionName[]> {
  const interventionsFromEvents = await getActiveInterventionsFromEvents(accountId, interventionEventsService);

  const interventionsFromPreviousState = previousStateToInterventions(previousState);

  return combineSets(interventionsFromEvents, interventionsFromPreviousState);
}

export default getActiveInterventions;

/**
 * Get a set of the currently active interventions on an account
 * @param accountId - the id of the user whose account is been intervened on
 * @param interventionEventsService - service to fetch intervention events
 */
async function getActiveInterventionsFromEvents(
  accountId: string,
  interventionEventsService: InterventionEventsService,
): Promise<Set<InterventionName>> {
  const existingInterventionEvents = await fetchExistingInterventionEvents(accountId, interventionEventsService);

  return filterEventStreamToActive(existingInterventionEvents);
}

interface InterventionEventStream {
  interventionState: InterventionState;
  interventionName: InterventionName;
}

export const filterEventStreamToActive = (eventStream: InterventionEventStream[]): Set<InterventionName> =>
  eventStream.reduce((res, event) => {
    if (event.interventionState === InterventionState.ACTIVE) return res.add(event.interventionName);

    if (event.interventionState !== InterventionState.IGNORED) res.delete(event.interventionName);

    return res;
  }, new Set<InterventionName>());

/**
 * Fetch all the intervention events for a given accountId
 * @param accountId - the id of the user whose account is been intervened
 */
async function fetchExistingInterventionEvents(
  accountId: string,
  interventionEventsService: InterventionEventsService,
) {
  const existingInterventionEvents = await interventionEventsService.fetchEventsForAccount(accountId);
  logger.debug(
    `${LOGS_PREFIX_SENSITIVE_INFO} Fetched existingInterventionEvents ${JSON.stringify(existingInterventionEvents)}`,
  );

  return existingInterventionEvents;
}

/**
 * Map the state from the account status table to a list of intervention names
 * @param previousState - Previous state from the account status table
 * @returns
 */
export function previousStateToInterventions(previousState?: StateDetails): InterventionName[] {
  if (!previousState) return [];

  if (previousState.resetPassword && previousState.reproveIdentity)
    return [InterventionName.RESET_PASSWORD, InterventionName.REPROVE_IDENTITY];
  if (previousState.resetPassword) return [InterventionName.RESET_PASSWORD];
  if (previousState.reproveIdentity) return [InterventionName.REPROVE_IDENTITY];

  if (previousState.blocked) return [InterventionName.PERMANENT_SUSPENSION];
  if (previousState.suspended) return [InterventionName.TEMPORARY_SUSPENSION];

  return [];
}

const combineSets = <T>(set1: Set<T> | T[], set2: Set<T> | T[]) => [...new Set([...set1, ...set2])];
