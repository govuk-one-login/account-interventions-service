import { AbstractAccountState } from './abstract-account-state';
import { AccountInterventionEnum, StateDetails } from '../../constants';

export class AccountSuspendedNoUserActions extends AbstractAccountState {
  readonly allowedInterventions: AccountInterventionEnum[] = [AccountInterventionEnum.FRAUD_BLOCK_ACCOUNT];
  readonly state: StateDetails = {
    blocked: true,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
  };
}

export class AccountUnsuspended extends AbstractAccountState {
  readonly allowedInterventions: AccountInterventionEnum[] = [AccountInterventionEnum.FRAUD_BLOCK_ACCOUNT];
  readonly state: StateDetails = {
    blocked: true,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
  };
}
