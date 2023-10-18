import { AccountInterventionEnum, AccountInterventions, StateDetails } from '../../constants';

export abstract class AbstractAccountState {
  abstract readonly allowedInterventions: AccountInterventionEnum[];
  abstract readonly state: StateDetails;

  public applyIntervention(intervention: AccountInterventionEnum) {
    const index = this.allowedInterventions.indexOf(intervention);
    if (index >= 0) {
      const interventionKey = this.allowedInterventions[index]!;
      //need to get the state details for the new desired state somehow...
      const newState = AccountInterventions.getState(interventionKey);
      if (!newState) throw new Error('Not a valid intervention');
    }
    throw new Error('invalid state transition');
  }
}

export function getNewState(currentState: StateDetails, intervention: AccountInterventionEnum) {
  const result = AccountInterventions.getIntervention(currentState)?.allowedTransitions;
  if (!result) throw new Error();
  const index = result.indexOf(intervention);
  if (index >= 0) {
    const interventionEnum = result[index]!;
    if (!interventionEnum) throw new Error('Not a valid intervention');
    return AccountInterventions.getState(interventionEnum);
  }
  throw new Error('invalid state transition');
}
