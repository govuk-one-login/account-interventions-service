import { transitionConfiguration } from './config';
import { StateDetails } from '../../data-types/interfaces';
import { EventsEnum, MetricNames } from '../../data-types/constants';
import { StateTransitionError } from '../../data-types/errors';
import logger from '../../commons/logger';
import { logAndPublishMetric } from '../../commons/metrics';
import { buildPartialUpdateAccountStateCommand } from '../../commons/build-partial-update-state-command';

export class AccountStateEngine {
  private static readonly configuration = transitionConfiguration;
  private static instance: AccountStateEngine;

  private constructor() {}
  public static getInstance() {
    if (!AccountStateEngine.instance) {
      AccountStateEngine.validateConfiguration();
      AccountStateEngine.instance = new AccountStateEngine();
    }
    return AccountStateEngine.instance;
  }

  /**
   * Private method to validate configuration object in use by this class
   */
  private static validateConfiguration() {
    const accountStates = Object.keys(AccountStateEngine.configuration.nodes).sort(compareString);
    const adjacencyLists = Object.keys(AccountStateEngine.configuration.adjacency).sort(compareString);
    if (JSON.stringify(adjacencyLists) !== JSON.stringify(accountStates))
      throw buildError(MetricNames.INVALID_STATE_ENGINE_CONFIGURATION, 'Invalid state engine configuration detected.');
    for (const element of Object.values(AccountStateEngine.configuration.edges)) {
      if (!accountStates.includes(element.to))
        throw buildError(
          MetricNames.INVALID_STATE_ENGINE_CONFIGURATION,
          'Invalid state engine configuration detected.',
        );
    }
  }

  /**
   * Helper method to return an Enum representation of the intervention event given the corresponding code
   * @param code - number mapping to an intervention event
   */
  getInterventionEnumFromCode(code: number) {
    const newStateName = AccountStateEngine.configuration.edges[code]?.name;
    if (!newStateName)
      throw buildError(
        MetricNames.INTERVENTION_CODE_NOT_FOUND_IN_CONFIG,
        `code: ${code} is not found in current configuration`,
      );
    return newStateName;
  }

  /**
   * Main method to compute if transition is allowed given the received event and the current state of the account
   * It finds the node corresponding to the received account state
   * It finds allowed transitions from that state
   * It finds the transition that the event is trying to apply
   * It checks if this transition can be found in the allowed transition for the state.
   *  if Yes, it returns a Partial for UpdateItemCommandInput to use in the database command
   *  if Not, it throws an error
   * @param event - EventEnum representation of event received
   * @param currentState - optional state object representation the current state of the account, it defaults to account unsuspended if nothing is passed
   */
  applyEventTransition(event: EventsEnum, currentState?: StateDetails) {
    if (!currentState)
      currentState = {
        blocked: false,
        suspended: false,
        resetPassword: false,
        reproveIdentity: false,
      };
    const currentStateName = this.findAccountStateName(currentState);
    const allowedTransition = this.findPossibleTransitions(currentStateName);
    const transition = this.getTransition(allowedTransition, event);
    const newStateObject = this.getNewStateObject(transition);
    if (compareStateObjects(newStateObject, currentState))
      throw buildError(
        MetricNames.TRANSITION_SAME_AS_CURRENT_STATE,
        'Computed new state is the same as the current state.',
      );
    return buildPartialUpdateAccountStateCommand(
      newStateObject,
      event,
      AccountStateEngine.configuration.edges[transition]?.interventionName,
    );
  }

  /**
   * Helper method to find the name of the state given a state object.
   * It returns the name if found, throws an error otherwise
   * @param state - StateDetail object representing the state of the account
   */
  private findAccountStateName(state: StateDetails) {
    for (const key of Object.keys(transitionConfiguration.nodes))
      if (compareStateObjects(transitionConfiguration.nodes[key]!, state)) return key;
    throw buildError(
      MetricNames.STATE_NOT_FOUND_IN_CURRENT_CONFIG,
      'Account state does not exists in current configuration.',
    );
  }

  /**
   * Helper method to return the list of possible transitions given a state name
   * If none can be found it throws an error
   * @param nodeKye - the state name used as the key to identify the nodes in the config object
   */
  private findPossibleTransitions(nodeKye: string) {
    const allowedTransition = AccountStateEngine.configuration.adjacency[nodeKye];
    if (!allowedTransition)
      throw buildError(
        MetricNames.NO_TRANSITIONS_FOUND_IN_CONFIG,
        `There are no allowed transitions from state ${nodeKye} in current configurations`,
      );
    return allowedTransition;
  }

  /**
   * Helper method to get the transition code from a given transition name
   * if the passed transition is in the given list of allowed transitions it returns the code
   * it throws an error otherwise
   *
   * @param allowedTransition - list of allowed transition codes
   * @param transition - EventsEnum representation of the proposed transition
   */
  private getTransition(allowedTransition: number[], transition: EventsEnum) {
    for (const element of allowedTransition) {
      if (AccountStateEngine.configuration.edges[element]?.name === transition.toString()) return element;
    }
    throw buildError(
      MetricNames.STATE_TRANSITION_NOT_ALLOWED_OR_IGNORED,
      `${transition} is not allowed from current state`,
    );
  }

  /**
   * Helper method to return the new account state given a transition
   * @param edge - code mapping to a specific transition
   */
  private getNewStateObject(edge: number) {
    const newStateName = AccountStateEngine.configuration.edges[edge]!.to;
    const newStateObject = AccountStateEngine.configuration.nodes[newStateName];
    if (!newStateObject)
      throw buildError(
        MetricNames.STATE_NOT_FOUND_IN_CURRENT_CONFIG,
        `state ${newStateName} not found in current config.`,
      );
    return newStateObject;
  }
}

/**
 * Helper method to build a StateTransitionError and log relevant information when an error is to br thrown
 * @param metricName - name of the metric to log
 * @param errorMessage - error message to be logged
 */
function buildError(metricName: MetricNames, errorMessage: string) {
  logAndPublishMetric(metricName);
  logger.error({ message: errorMessage });
  return new StateTransitionError(errorMessage);
}

/**
 * Helper method to compare two StateDetails objects.
 * It returns true, IFF all fields are the same, false otherwise
 * @param object1 - first account state
 * @param object2 - second accoutn state
 */
function compareStateObjects(object1: StateDetails, object2: StateDetails) {
  return (
    object1.resetPassword === object2.resetPassword &&
    object1.reproveIdentity === object2.reproveIdentity &&
    object1.blocked === object2.blocked &&
    object1.suspended === object2.suspended
  );
}

function compareString(a: string, b: string) {
  if (a === b) return 0;
  else if (a < b) return -1;
  else return 1;
}
