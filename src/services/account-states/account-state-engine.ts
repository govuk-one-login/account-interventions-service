import {
  InterventionEventDetails,
  InterventionTransitionConfigurations,
  StateDetails,
  UserLedActionTransitionConfigurations,
} from '../../data-types/interfaces';
import { interventionsConfig, userLedActionsConfig } from './config';
import { EventsEnum, MetricNames } from '../../data-types/constants';
import { buildPartialUpdateAccountStateCommand } from '../../commons/build-partial-update-state-command';
import { logAndPublishMetric } from '../../commons/metrics';
import { StateTransitionError } from '../../data-types/errors';

/**
 * State Engine Class
 * It stores the configuration for interventions and user actions transitions
 */
export class AccountStateEngine {
  private static readonly interventionConfigurations: InterventionTransitionConfigurations = interventionsConfig;
  private static readonly userLedActionConfiguration: UserLedActionTransitionConfigurations = userLedActionsConfig;

  /**
   * Private helper method: given an account state object, it searches for that state in the intervention
   * configuration object and returns the corresponding key
   * @param accountState - object = blocked: Boolean; suspended: Boolean; resetPassword: Boolean; resetIdentity: Boolean
   */
  private static getInterventionEnumFromStateDetail(accountState: StateDetails) {
    for (const key of Object.keys(AccountStateEngine.interventionConfigurations)) {
      const state = (AccountStateEngine.interventionConfigurations[key] as InterventionEventDetails).state;
      if (
        accountState.blocked === state?.blocked &&
        accountState.suspended === state?.suspended &&
        accountState.reproveIdentity === state?.reproveIdentity &&
        accountState.resetPassword === state?.resetPassword
      )
        return key as EventsEnum;
    }
    logAndPublishMetric(MetricNames.STATE_NOT_FOUND_IN_CURRENT_CONFIG);
    throw new StateTransitionError('No intervention could be found in current config for this state.');
  }

  /**
   * Helper method to process intervention transition: it receives enums representing current state of the account and proposed intervention
   * if the transition is allowed, it retrieves the list of allowed transitions for the current state and returns an object containing new state and intervention name,
   * it throws an error otherwise
   * @param proposedIntervention - Enum representation of intervention event received
   * @param accountStateEventEnum - Enum representation of current state of the account
   */
  private static processInterventionTransition(proposedIntervention: EventsEnum, accountStateEventEnum: EventsEnum) {
    const currentStateInterventionObject = AccountStateEngine.interventionConfigurations[accountStateEventEnum];
    if (!currentStateInterventionObject) {
      logAndPublishMetric(MetricNames.INTERVENTION_EVENT_NOT_FOUND_IN_CURRENT_CONFIG);
      throw new StateTransitionError(`State enum ${accountStateEventEnum} does not exist in current config.`);
    }
    if (!currentStateInterventionObject.allowedTransitions.includes(proposedIntervention)) {
      logAndPublishMetric(MetricNames.STATE_TRANSITION_NOT_ALLOWED_OR_IGNORED);
      throw new StateTransitionError(
        `Intervention ${proposedIntervention} is now allowed on the current account state ${accountStateEventEnum}.`,
      );
    }
    const newStateDetails = AccountStateEngine.interventionConfigurations[proposedIntervention];
    if (!newStateDetails) {
      logAndPublishMetric(MetricNames.INTERVENTION_EVENT_NOT_FOUND_IN_CURRENT_CONFIG);
      throw new StateTransitionError(`Intervention ${proposedIntervention} cannot be found in current config.`);
    }
    return newStateDetails;
  }

  /**
   * Helper method to process user action transition:
   * it retrieves the state from which the received user action is allowed, if it is allowed it computes the new state and returns it,
   * it throws an error otherwise
   * @param proposedUserAction - Enum representation of the user action event received
   * @param currentAccountStateDetails - State object representation of current state of the account
   * @param accountStateEventEnum - Enum representation of the current state of the account
   */
  private static processUserActionTransition(
    proposedUserAction: EventsEnum,
    currentAccountStateDetails: StateDetails,
    accountStateEventEnum: EventsEnum,
  ) {
    const userActionEventObject = AccountStateEngine.userLedActionConfiguration[proposedUserAction];
    if (!userActionEventObject) {
      logAndPublishMetric(MetricNames.USER_ACTION_EVENT_DOES_NOT_EXIST_IN_CURRENT_CONFIG);
      throw new StateTransitionError(`User action ${proposedUserAction} event does not exist in current config.`);
    }
    if (!userActionEventObject.allowedFromStates.includes(accountStateEventEnum)) {
      logAndPublishMetric(MetricNames.STATE_TRANSITION_NOT_ALLOWED_OR_IGNORED);
      throw new StateTransitionError(
        `User action ${proposedUserAction} is not allowed on the current account state ${accountStateEventEnum}.`,
      );
    }
    const newState = { ...currentAccountStateDetails, ...userActionEventObject.state };
    newState.suspended = newState.resetPassword || newState.reproveIdentity;
    return newState;
  }

  /**
   * Given a code, it searches the intervention configuration object for the code and returns
   * the corresponding key
   * @param code - code corresponding to an intervention event
   */
  static getInterventionEnumFromCode(code: number) {
    for (const key of Object.keys(AccountStateEngine.interventionConfigurations)) {
      const code_ = (AccountStateEngine.interventionConfigurations[key] as InterventionEventDetails).code;
      if (code === code_) return key as EventsEnum;
    }
    logAndPublishMetric(MetricNames.NO_INTERVENTION_FOUND_FOR_THIS_CODE);
    throw new StateTransitionError(`No intervention could be found in current config for code ${code}.`);
  }

  /**
   * Main method that takes a proposed transition (user action or intervention), and an optional account state object.
   * It computes the EventEnum representation of the current account state and passes this to the relevant helper method to process the transition (user action or intervention)
   * If the transition is valid, it builds partial UpdateCommandInput object and returns it to the caller. It throws an error otherwise
   * @param proposedTransition - Enum representation of received event
   * @param currentAccountStateDetails - optional account state object, if nothing is passed it defaults to an unsuspended / unblocked state
   */
  static applyEventTransition(proposedTransition: EventsEnum, currentAccountStateDetails?: StateDetails) {
    if (!currentAccountStateDetails)
      currentAccountStateDetails = {
        blocked: false,
        suspended: false,
        resetPassword: false,
        reproveIdentity: false,
      };
    const accountStateEventEnum = AccountStateEngine.getInterventionEnumFromStateDetail(currentAccountStateDetails);

    if (accountStateEventEnum === proposedTransition) {
      logAndPublishMetric(MetricNames.TRANSITION_SAME_AS_CURRENT_STATE);
      throw new StateTransitionError(
        `Proposed transition ${proposedTransition} is the same as current account state ${accountStateEventEnum}.`,
      );
    }

    let stateChange;
    let interventionName: string | undefined;

    if (
      proposedTransition === EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL ||
      proposedTransition === EventsEnum.IPV_IDENTITY_ISSUED
    ) {
      stateChange = AccountStateEngine.processUserActionTransition(
        proposedTransition,
        currentAccountStateDetails,
        accountStateEventEnum,
      );
    } else {
      const newStateDetails = AccountStateEngine.processInterventionTransition(
        proposedTransition,
        accountStateEventEnum,
      );
      interventionName = newStateDetails.interventionName;
      stateChange = newStateDetails.state;
    }

    const newState = { ...currentAccountStateDetails, ...stateChange };
    return buildPartialUpdateAccountStateCommand(newState, proposedTransition, interventionName);
  }
}
