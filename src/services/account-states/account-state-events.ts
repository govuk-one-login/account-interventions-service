import { StateDetails, TransitionConfiguration } from '../../data-types/interfaces';
import { transitionConfig } from './config';
import { AccountStateEventEnum, buildPartialUpdateAccountStateCommand } from '../../data-types/constants';

export class AccountStateEvents {
  private static readonly config: TransitionConfiguration = transitionConfig;

  static getState(intervention: AccountStateEventEnum) {
    const eventObject = AccountStateEvents.config[intervention];
    if (!eventObject) throw new Error('selected intervention event does not exist in current config');
    return eventObject.state;
  }

  static getAllowedTransitions(intervention: AccountStateEventEnum) {
    const eventObject = AccountStateEvents.config[intervention];
    if (!eventObject || !eventObject.allowedTransitions)
      throw new Error('select intervention event does not exist in current config');
    return eventObject.allowedTransitions;
  }

  static getCode(intervention: AccountStateEventEnum) {
    const eventObject = AccountStateEvents.config[intervention];
    if (!eventObject) throw new Error('select intervention event does not exist in current config');
    return eventObject.code;
  }

  static getAccountEvent(accountState: StateDetails) {
    for (const key of Object.keys(AccountStateEvents.config)) {
      const state = AccountStateEvents.config[key]?.state;
      if (JSON.stringify(state) === JSON.stringify(accountState)) return key as AccountStateEventEnum;
    }
    throw new Error('no intervention could be found in current config for this state');
  }

  static applyEventTransition(currentAccountStateDetails: StateDetails, proposedTransition: AccountStateEventEnum) {
    const currentState = AccountStateEvents.getAccountEvent(currentAccountStateDetails);
    const allowedTransitionsForCurrentState = AccountStateEvents.getAllowedTransitions(currentState);
    if (!allowedTransitionsForCurrentState.includes(proposedTransition))
      throw new Error('requested transition is not allowed from current state');
    const newState = AccountStateEvents.getState(proposedTransition);
    return AccountStateEvents.prepareUpdateItemCommand(newState, proposedTransition);
  }

  static prepareUpdateItemCommand(newSate: StateDetails, transition: AccountStateEventEnum) {
    const object = AccountStateEvents.config[AccountStateEvents.getAccountEvent(newSate)];
    if (!object) throw new Error('I could not find new account state in current config');
    return buildPartialUpdateAccountStateCommand(object, transition);
  }
}
