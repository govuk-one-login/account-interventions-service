export enum AccountInterventionEnum {
  FRAUD_SUSPEND_ACCOUNT = 'FRAUD_SUSPEND_ACCOUNT',
  FRAUD_UNSUSPEND_ACCOUNT = 'FRAUD_UNSUSPEND_ACCOUNT',
  FRAUD_BLOCK_ACCOUNT = 'FRAUD_BLOCK_ACCOUNT',
  FRAUD_UNBLOCK_ACCOUNT = 'FRAUD_UNBLOCK_ACCOUNT',
  FRAUD_FORCED_USER_PASSWORD_RESET = 'FRAUD_FORCED_USER_PASSWORD_RESET', //pragma: allowlist secret
  FRAUD_FORCED_USER_IDENTITY_REVERIFICATION = 'FRAUD_FORCED_USER_IDENTITY_REVERIFICATION',
  FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION = 'FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION', //pragma: allowlist secret
  FRAUD_NO_INTERVENTION = 'FRAUD_NO_INTERVENTION',
}

export interface StateDetails {
  blocked: boolean | undefined;
  suspended: boolean | undefined;
  reproveIdentity: boolean | undefined;
  resetPassword: boolean | undefined;
}

export class AccountInterventions {
  static readonly FRAUD_SUSPEND_ACCOUNT = new AccountInterventions(
    AccountInterventionEnum.FRAUD_SUSPEND_ACCOUNT,
    {
      blocked: true,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
    },
    [AccountInterventionEnum.FRAUD_BLOCK_ACCOUNT],
  );
  static readonly FRAUD_UNSUSPEND_ACCOUNT = new AccountInterventions(
    AccountInterventionEnum.FRAUD_UNSUSPEND_ACCOUNT,
    { blocked: true, suspended: false, resetPassword: false, reproveIdentity: false },
    [AccountInterventionEnum.FRAUD_BLOCK_ACCOUNT],
  );

  private constructor(
    private readonly key: AccountInterventionEnum,
    public readonly value: StateDetails,
    public readonly allowedTransitions: AccountInterventionEnum[],
  ) {}

  static getState(intervention: AccountInterventionEnum) {
    return ((AccountInterventions as never)[intervention.toString()] as AccountInterventions)?.value;
  }

  static getAllowedTransitions(intervention: AccountInterventionEnum) {
    return ((AccountInterventions as never)[intervention.toString()] as AccountInterventions)?.allowedTransitions;
  }

  static getIntervention(accountState: StateDetails) {
    for (const key in Object.keys(AccountInterventions)) {
      const state = AccountInterventions.getState(((AccountInterventions as never)[key] as AccountInterventions).key);
      if (JSON.stringify(state) === JSON.stringify(accountState))
        return (AccountInterventions as never)[key] as AccountInterventions;
    }
    return;
  }

  toString() {
    return this.key;
  }
}
