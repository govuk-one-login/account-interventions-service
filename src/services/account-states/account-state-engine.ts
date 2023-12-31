import { transitionConfiguration } from './config';
import { AccountStateEngineOutput, StateDetails } from '../../data-types/interfaces';
import { AISInterventionTypes, EventsEnum, MetricNames } from '../../data-types/constants';
import { StateEngineConfigurationError, StateTransitionError } from '../../data-types/errors';
import logger from '../../commons/logger';
import { logAndPublishMetric } from '../../commons/metrics';

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
    const accountStates = Object.keys(AccountStateEngine.configuration.nodes).sort(compareStrings);
    const adjacencyLists = Object.keys(AccountStateEngine.configuration.adjacency).sort(compareStrings);
    if (JSON.stringify(adjacencyLists) !== JSON.stringify(accountStates))
      throw buildConfigurationError(
        MetricNames.INVALID_STATE_ENGINE_CONFIGURATION,
        'Invalid state engine configuration detected. Adjacency mismatch',
      );
    for (const element of Object.values(AccountStateEngine.configuration.edges)) {
      if (!accountStates.includes(element.to))
        throw buildConfigurationError(
          MetricNames.INVALID_STATE_ENGINE_CONFIGURATION,
          'Invalid state engine configuration detected. Edge mismatch',
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
      throw buildConfigurationError(
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
  applyEventTransition(event: EventsEnum, currentState: StateDetails): AccountStateEngineOutput {
    const currentStateName = this.findAccountStateName(currentState);
    const allowedTransition = this.findPossibleTransitions(currentStateName);
    const transition = this.getTransition(allowedTransition, event);
    const newStateObject = this.getNewStateObject(transition);
    if (areAccountStatesTheSame(newStateObject, currentState))
      throw buildStateTransitionError(
        MetricNames.TRANSITION_SAME_AS_CURRENT_STATE,
        'Computed new state is the same as the current state.',
        event,
      );
    return {
      newState: newStateObject,
      interventionName: AccountStateEngine.configuration.edges[transition]?.interventionName as AISInterventionTypes,
    };
  }

  /**
   * Helper method to find the name of the state given a state object.
   * It returns the name if found, throws an error otherwise
   * @param state - StateDetail object representing the state of the account
   */
  private findAccountStateName(state: StateDetails) {
    for (const key of Object.keys(transitionConfiguration.nodes))
      if (areAccountStatesTheSame(transitionConfiguration.nodes[key]!, state)) return key;
    throw buildConfigurationError(
      MetricNames.STATE_NOT_FOUND_IN_CURRENT_CONFIG,
      'Account state does not exists in current configuration.',
    );
  }

  /**
   * Helper method to return the list of possible transitions given a state name
   * If none can be found it throws an error
   * @param nodeKey - the state name used as the key to identify the nodes in the config object
   */
  private findPossibleTransitions(nodeKey: string) {
    const allowedTransition = AccountStateEngine.configuration.adjacency[nodeKey];
    if (!allowedTransition)
      throw buildConfigurationError(
        MetricNames.NO_TRANSITIONS_FOUND_IN_CONFIG,
        `There are no allowed transitions from state ${nodeKey} in current configurations`,
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
    for (const edge of allowedTransition) {
      if (AccountStateEngine.configuration.edges[edge]?.name === transition.toString()) return edge;
    }
    throw buildStateTransitionError(
      MetricNames.STATE_TRANSITION_NOT_ALLOWED_OR_IGNORED,
      `${transition} is not allowed from current state`,
      transition,
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
      throw buildConfigurationError(
        MetricNames.STATE_NOT_FOUND_IN_CURRENT_CONFIG,
        `state ${newStateName} not found in current config.`,
      );
    return newStateObject;
  }
}

/**
 * Helper method to build a StateTransitionError and log relevant information when this type of error is to be thrown
 * @param metricName - name of the metric to log
 * @param errorMessage - error message to be logged
 * @param transition - EventEnum representation of transition
 */
function buildStateTransitionError(metricName: MetricNames, errorMessage: string, transition: EventsEnum) {
  logAndPublishMetric(metricName);
  logger.error({ message: errorMessage });
  return new StateTransitionError(errorMessage, transition);
}

/**
 * Helper method to build a ConfigurationError and log relevant information when this type of error is to be thrown
 * @param metricName - name of the metric
 * @param errorMessage - error message to be logged
 */
function buildConfigurationError(metricName: MetricNames, errorMessage: string) {
  logAndPublishMetric(metricName);
  logger.error({ message: errorMessage });
  return new StateEngineConfigurationError(errorMessage);
}

/**
 * Helper method to compare two StateDetails objects.
 * It returns true, IFF all fields are the same, false otherwise
 * @param aState - first account state
 * @param anotherState - second account state
 */
function areAccountStatesTheSame(aState: StateDetails, anotherState: StateDetails) {
  return (
    aState.resetPassword === anotherState.resetPassword &&
    aState.reproveIdentity === anotherState.reproveIdentity &&
    aState.blocked === anotherState.blocked &&
    aState.suspended === anotherState.suspended
  );
}

/**
 * Helper method to provide explicit sorting logic for arrays
 * @param aString - first string
 * @param anotherString - second string
 */
function compareStrings(aString: string, anotherString: string) {
  if (aString === anotherString) return 0;
  else if (aString < anotherString) return -1;
  else return 1;
}
