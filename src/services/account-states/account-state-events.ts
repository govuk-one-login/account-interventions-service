import {
  InterventionEventDetails,
  InterventionTransitionConfigurations,
  StateDetails,
  UserLedActionTransitionConfigurations,
} from '../../data-types/interfaces';
import { interventionsConfig, userLedActionsConfigurations } from './config';
import { AccountStateEventEnum, buildPartialUpdateAccountStateCommand } from '../../data-types/constants';

export class AccountStateEvents {
  private static readonly interventionConfigurations: InterventionTransitionConfigurations = interventionsConfig;
  private static readonly userLedActionConfiguration: UserLedActionTransitionConfigurations =
    userLedActionsConfigurations;

  static getInterventionEnumFromStateDetail(accountState: StateDetails) {
    for (const key of Object.keys(AccountStateEvents.interventionConfigurations)) {
      const state = (AccountStateEvents.interventionConfigurations[key] as InterventionEventDetails).state;
      if (JSON.stringify(state) === JSON.stringify(accountState)) return key as AccountStateEventEnum;
    }
    throw new Error('no intervention could be found in current config for this state');
  }

  static applyEventTransition(proposedTransition: AccountStateEventEnum, currentAccountStateDetails?: StateDetails) {
    if (!currentAccountStateDetails)
      currentAccountStateDetails = {
        blocked: false,
        suspended: false,
        resetPassword: false,
        reproveIdentity: false,
      };
    const accountStateEventEnum = AccountStateEvents.getInterventionEnumFromStateDetail(currentAccountStateDetails);
    let stateChange;
    let interventionName: string | undefined;

    if (
      proposedTransition === AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL ||
      proposedTransition === AccountStateEventEnum.IPV_IDENTITY_ISSUED
    ) {
      const userActionEventObject = AccountStateEvents.userLedActionConfiguration[proposedTransition];
      if (!userActionEventObject) throw new Error('received user action event does not exist in current config');
      if (!userActionEventObject.allowedFromStates.includes(accountStateEventEnum))
        throw new Error('this user action is not allowed on the current account state');
      const newState = Object.assign({ ...currentAccountStateDetails }, userActionEventObject.state);
      newState.suspended = newState.resetPassword || newState.reproveIdentity;
      newState.blocked = false;
      stateChange = newState;
    } else {
      const currentState = AccountStateEvents.interventionConfigurations[accountStateEventEnum];

      if (!currentState) throw new Error('selected current state does not exist in current config');
      if (!currentState.allowedTransitions.includes(proposedTransition))
        throw new Error(
          `this intervention ${proposedTransition} is now allowed on the current account state ${accountStateEventEnum}`,
        );
      const newState = AccountStateEvents.interventionConfigurations[proposedTransition];
      if (!newState) throw new Error('selected new state does not exist in current config');
      interventionName = newState.interventionName;
      stateChange = newState.state;
    }

    if (JSON.stringify(stateChange) === JSON.stringify(currentAccountStateDetails))
      throw new Error('new state is the same as current state');

    const newState = Object.assign({ ...currentAccountStateDetails }, stateChange);
    console.log();
    return buildPartialUpdateAccountStateCommand(newState, proposedTransition, interventionName);
  }
}
