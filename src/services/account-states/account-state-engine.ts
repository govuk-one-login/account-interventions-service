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

export class AccountStateEngine {
  private static readonly interventionConfigurations: InterventionTransitionConfigurations = interventionsConfig;
  private static readonly userLedActionConfiguration: UserLedActionTransitionConfigurations = userLedActionsConfig;

  private static getInterventionEnumFromStateDetail(accountState: StateDetails) {
    for (const key of Object.keys(AccountStateEngine.interventionConfigurations)) {
      const state = (AccountStateEngine.interventionConfigurations[key] as InterventionEventDetails).state;
      if (
        accountState.blocked === state.blocked &&
        accountState.suspended === state.suspended &&
        accountState.reproveIdentity === state.reproveIdentity &&
        accountState.resetPassword === state.resetPassword
      )
        return key as EventsEnum;
    }
    logAndPublishMetric(MetricNames.STATE_NOT_FOUND_IN_CURRENT_CONFIG);
    throw new StateTransitionError('no intervention could be found in current config for this state');
  }

  static getInterventionEnumFromCode(code: number) {
    for (const key of Object.keys(AccountStateEngine.interventionConfigurations)) {
      const code_ = (AccountStateEngine.interventionConfigurations[key] as InterventionEventDetails).code;
      if (code === code_) return key as EventsEnum;
    }
    logAndPublishMetric(MetricNames.NO_INTERVENTION_FOUND_FOR_THIS_CODE);
    throw new StateTransitionError(`no intervention could be found in current config for code ${code}`);
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
        `proposed transition ${proposedTransition} is the same as current account state ${accountStateEventEnum}`,
      );
    }

    let stateChange;
    let interventionName: string | undefined;

    if (
      proposedTransition === EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL ||
      proposedTransition === EventsEnum.IPV_IDENTITY_ISSUED
    ) {
      const userActionEventObject = AccountStateEngine.userLedActionConfiguration[proposedTransition];
      if (!userActionEventObject) {
        logAndPublishMetric(MetricNames.USER_ACTION_EVENT_DOES_NOT_EXIST_IN_CURRENT_CONFIG);
        throw new StateTransitionError(
          `received user action ${proposedTransition} event does not exist in current config`,
        );
      }
      if (!userActionEventObject.allowedFromStates.includes(accountStateEventEnum)) {
        logAndPublishMetric(MetricNames.STATE_TRANSITION_NOT_ALLOWED);
        throw new StateTransitionError(
          `this user action ${proposedTransition} is not allowed on the current account state ${accountStateEventEnum}`,
        );
      }
      const newState = Object.assign({ ...currentAccountStateDetails }, userActionEventObject.state);
      newState.suspended = newState.resetPassword || newState.reproveIdentity;
      stateChange = newState;
    } else {
      const currentState = AccountStateEngine.interventionConfigurations[accountStateEventEnum];
      if (!currentState) {
        logAndPublishMetric(MetricNames.INTERVENTION_EVENT_NOT_FOUND_IN_CURRENT_CONFIG);
        throw new StateTransitionError(`current state enum ${accountStateEventEnum} does not exist in current config`);
      }
      if (!currentState.allowedTransitions.includes(proposedTransition)) {
        logAndPublishMetric(MetricNames.STATE_TRANSITION_NOT_ALLOWED);
        throw new StateTransitionError(
          `this intervention ${proposedTransition} is now allowed on the current account state ${accountStateEventEnum}`,
        );
      }

      const newState = AccountStateEngine.interventionConfigurations[proposedTransition];
      if (!newState) {
        logAndPublishMetric(MetricNames.STATE_NOT_FOUND_IN_CURRENT_CONFIG);
        throw new StateTransitionError('new state does not exist in current config');
      }
      interventionName = newState.interventionName;
      stateChange = newState.state;
    }

    const newState = Object.assign({ ...currentAccountStateDetails }, stateChange);
    return buildPartialUpdateAccountStateCommand(newState, proposedTransition, interventionName);
  }
}
