import { transitionConfiguration } from './config';
import { AccountStateEngineOutput, StateDetails } from '../../data-types/interfaces';
import {
  AISInterventionTypes,
  Codes,
  EventsEnum,
  isCode,
  MetricNames,
  PossibleAccountStatus,
  userLedActionList,
} from '../../data-types/constants';
import { StateEngineConfigurationError, StateTransitionError } from '../../data-types/errors';
import logger from '../../commons/logger';
import { addMetric } from '../../commons/metrics';

export class AccountStateEngine {
  private static readonly configuration = transitionConfiguration;
  private static instance: AccountStateEngine;

  public static getInstance() {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
    const accountStates = Object.keys(AccountStateEngine.configuration.nodes).toSorted(compareStrings);
    const adjacencyLists = Object.keys(AccountStateEngine.configuration.adjacency).toSorted(compareStrings);
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
   * @param code - string mapping to an intervention event
   */
  getInterventionEnumFromCode(code: string): EventsEnum {
    if (!isCode(code))
      throw buildConfigurationError(
        MetricNames.INTERVENTION_CODE_NOT_FOUND_IN_CONFIG,
        `code: ${code} is not found in current configuration`,
      );

    return AccountStateEngine.configuration.edges[code].name;
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
   * @param initialState - optional state object representation the current state of the account, it defaults to account unsuspended if nothing is passed
   */
  applyEventTransition(
    event: EventsEnum,
    initialState: StateDetails,
    interventionName: string | undefined,
  ): AccountStateEngineOutput {
    const allowedTransitions = this.determineNextAllowableInterventions(initialState);
    const transition = this.getTransition(allowedTransitions, event, initialState, interventionName);
    const newStateObject = this.getNewStateObject(transition);
    if (areAccountStatesTheSame(newStateObject, initialState))
      throw buildConfigurationError(
        MetricNames.TRANSITION_SAME_AS_CURRENT_STATE,
        `Computed new state is the same as the current state. Current state: ${interventionName ?? '(empty)'}; Event: ${event}`,
      );
    return {
      stateResult: newStateObject,
      interventionName: AccountStateEngine.configuration.edges[transition].interventionName,
      nextAllowableInterventions: this.findPossibleTransitions(this.findAccountStateName(newStateObject)),
    };
  }

  /** Method to determine next allowable interventions given the account state name of the current state.
   *
   * @param state - state based on which the next interventions are allowed
   */
  determineNextAllowableInterventions(state: StateDetails) {
    const stateName = this.findAccountStateName(state);
    return this.findPossibleTransitions(stateName);
  }

  /**
   * Helper method to find the name of the state given a state object.
   * It returns the name if found, throws an error otherwise
   * @param state - StateDetail object representing the state of the account
   */
  private findAccountStateName(state: StateDetails): PossibleAccountStatus {
    for (const [key, node] of Object.entries(transitionConfiguration.nodes)) {
      if (areAccountStatesTheSame(node, state)) return key as PossibleAccountStatus;
    }
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
  private findPossibleTransitions(nodeKey: PossibleAccountStatus): Codes[] {
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
   * @param initialState - initial state of the account
   */
  private getTransition(
    allowedTransition: Codes[],
    transition: EventsEnum,
    initialState: StateDetails,
    interventionName: string | undefined,
  ) {
    for (const edge of allowedTransition) {
      if (AccountStateEngine.configuration.edges[edge].name.toString() === transition.toString()) return edge;
    }
    throw buildStateTransitionError(
      MetricNames.STATE_TRANSITION_NOT_ALLOWED_OR_IGNORED,
      `${transition} is not allowed from current state. Current state: ${interventionName ?? '(empty)'}`,
      transition,
      initialState,
    );
  }

  /**
   * Helper method to return the new account state given a transition
   * @param edge - code mapping to a specific transition
   */
  private getNewStateObject(edge: Codes) {
    const newStateName = AccountStateEngine.configuration.edges[edge].to;
    const newStateObject = AccountStateEngine.configuration.nodes[newStateName];

    return newStateObject;
  }
}

/**
 * Helper method to build a StateTransitionError and log relevant information when this type of error is to be thrown
 * @param metricName - name of the metric to log
 * @param errorMessage - error message to be logged
 * @param transition - EventEnum representation of transition
 * @param initialState - StateDetails of the initial state, before applying interventions
 */
function buildStateTransitionError(
  metricName: MetricNames,
  errorMessage: string,
  transition: EventsEnum,
  initialState: StateDetails,
) {
  if (
    !(
      areAccountStatesTheSame(initialState, transitionConfiguration.nodes[PossibleAccountStatus.AccountIsOkay]) &&
      userLedActionList.includes(transition)
    )
  ) {
    addMetric(metricName);
    logger.error({ message: errorMessage });
  }

  return new StateTransitionError(errorMessage, transition, {
    stateResult: initialState,
    nextAllowableInterventions: AccountStateEngine.getInstance().determineNextAllowableInterventions(initialState),
    interventionName: AISInterventionTypes.AIS_NO_INTERVENTION,
  });
}

/**
 * Helper method to build a ConfigurationError and log relevant information when this type of error is to be thrown
 * @param metricName - name of the metric
 * @param errorMessage - error message to be logged
 */
function buildConfigurationError(metricName: MetricNames, errorMessage: string) {
  addMetric(metricName);
  logger.error({ message: errorMessage });
  return new StateEngineConfigurationError(errorMessage);
}

/**
 * Helper method to compare two StateDetails objects.
 * It returns true, IFF all fields are the same, false otherwise
 * @param aState - first account state
 * @param anotherState - second account state
 */
export function areAccountStatesTheSame(aState: StateDetails, anotherState: StateDetails) {
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
export function compareStrings(aString: string, anotherString: string) {
  if (aString === anotherString) return 0;
  else if (aString < anotherString) return -1;
  else return 1;
}
