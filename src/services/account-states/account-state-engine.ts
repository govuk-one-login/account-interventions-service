import { graph } from './config';
import { StateDetails } from '../../data-types/interfaces';
import { EventsEnum, MetricNames } from '../../data-types/constants';
import { StateTransitionError } from '../../data-types/errors';
import logger from '../../commons/logger';
import { logAndPublishMetric } from '../../commons/metrics';
import { buildPartialUpdateAccountStateCommand } from '../../commons/build-partial-update-state-command';

export class AccountStateEngine {
  private static readonly configuration = graph;
  private static instance: AccountStateEngine;

  private constructor() {}
  public static getInstance() {
    if (!AccountStateEngine.instance) {
      AccountStateEngine.validateConfiguration();
      AccountStateEngine.instance = new AccountStateEngine();
    }
    return AccountStateEngine.instance;
  }

  private static validateConfiguration() {
    const accountStates = Object.keys(AccountStateEngine.configuration.nodes);
    const adjacencyLists = Object.keys(AccountStateEngine.configuration.adjacency);
    if (!(JSON.stringify(adjacencyLists.sort()) === JSON.stringify(accountStates.sort())))
      throw buildError(MetricNames.INVALID_STATE_ENGINE_CONFIGURATION, 'Invalid state engine configuration detected.');
    for (const element of Object.values(AccountStateEngine.configuration.edges)) {
      if (!accountStates.includes(element.to))
        throw buildError(
          MetricNames.INVALID_STATE_ENGINE_CONFIGURATION,
          'Invalid state engine configuration detected.',
        );
    }
  }

  getInterventionEnumFromCode(code: number) {
    const newStateName = AccountStateEngine.configuration.edges[code]?.name;
    if (!newStateName)
      throw buildError(
        MetricNames.INTERVENTION_CODE_NOT_FOUND_IN_CONFIG,
        `code: ${code} is not found in current configuration`,
      );
    return newStateName;
  }

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

  private findAccountStateName(state: StateDetails) {
    for (const key of Object.keys(graph.nodes)) if (compareStateObjects(graph.nodes[key]!, state)) return key;
    throw buildError(
      MetricNames.STATE_NOT_FOUND_IN_CURRENT_CONFIG,
      'Account state does not exists in current configuration.',
    );
  }

  private findPossibleTransitions(nodeKye: string) {
    const allowedTransition = AccountStateEngine.configuration.adjacency[nodeKye];
    if (!allowedTransition)
      throw buildError(
        MetricNames.NO_TRANSITIONS_FOUND_IN_CONFIG,
        `There are no allowed transitions from state ${nodeKye} in current configurations`,
      );
    return allowedTransition;
  }

  private getTransition(allowedTransition: number[], transition: EventsEnum) {
    for (const element of allowedTransition) {
      if (AccountStateEngine.configuration.edges[element]?.name === transition.toString()) return element;
    }
    throw buildError(
      MetricNames.STATE_TRANSITION_NOT_ALLOWED_OR_IGNORED,
      `${transition} is not allowed from current state`,
    );
  }

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

function buildError(metricName: MetricNames, errorMessage: string) {
  logAndPublishMetric(metricName);
  logger.error({ message: errorMessage });
  return new StateTransitionError(errorMessage);
}

function compareStateObjects(object1: StateDetails, object2: StateDetails) {
  return (
    object1.resetPassword === object2.resetPassword &&
    object1.reproveIdentity === object2.reproveIdentity &&
    object1.blocked === object2.blocked &&
    object1.suspended === object2.suspended
  );
}
