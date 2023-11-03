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
   * Helper method to process intervention transition:
   * @param proposedTransition - Enum representation of intervention event received
   * @param accountStateEventEnum - Enum representation of current state of the account
   */
  private static processInterventionTransition(proposedTransition: EventsEnum, accountStateEventEnum: EventsEnum) {
    const currentStateInterventionObject = AccountStateEngine.interventionConfigurations[accountStateEventEnum];
    if (!currentStateInterventionObject) {
      logAndPublishMetric(MetricNames.INTERVENTION_EVENT_NOT_FOUND_IN_CURRENT_CONFIG);
      throw new StateTransitionError(`State enum ${accountStateEventEnum} does not exist in current config.`);
    }
    if (!currentStateInterventionObject.allowedTransitions.includes(proposedTransition)) {
      logAndPublishMetric(MetricNames.STATE_TRANSITION_NOT_ALLOWED_OR_IGNORED);
      throw new StateTransitionError(
        `Intervention ${proposedTransition} is now allowed on the current account state ${accountStateEventEnum}.`,
      );
    }
    const newStateDetails = AccountStateEngine.interventionConfigurations[proposedTransition];
    if (!newStateDetails) {
      logAndPublishMetric(MetricNames.INTERVENTION_EVENT_NOT_FOUND_IN_CURRENT_CONFIG);
      throw new StateTransitionError(`Intervention ${proposedTransition} cannot be found in current config.`);
    }
    return newStateDetails;
  }

  private static processUserActionTransition(
    proposedTransition: EventsEnum,
    currentAccountStateDetails: StateDetails,
    accountStateEventEnum: EventsEnum,
  ) {
    const userActionEventObject = AccountStateEngine.userLedActionConfiguration[proposedTransition];
    if (!userActionEventObject) {
      logAndPublishMetric(MetricNames.USER_ACTION_EVENT_DOES_NOT_EXIST_IN_CURRENT_CONFIG);
      throw new StateTransitionError(`User action ${proposedTransition} event does not exist in current config.`);
    }
    if (!userActionEventObject.allowedFromStates.includes(accountStateEventEnum)) {
      logAndPublishMetric(MetricNames.STATE_TRANSITION_NOT_ALLOWED_OR_IGNORED);
      throw new StateTransitionError(
        `User action ${proposedTransition} is not allowed on the current account state ${accountStateEventEnum}.`,
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
