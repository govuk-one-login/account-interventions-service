import { AccountStateEventEnum, AISInterventionTypes } from '../../data-types/constants';
import {
  InterventionTransitionConfigurations,
  UserLedActionTransitionConfigurations,
} from '../../data-types/interfaces';

export const interventionsConfig: InterventionTransitionConfigurations = {
  NO_EXISTING_INTERVENTIONS: {
    code: 0,
    state: {
      blocked: false,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
    },
    allowedTransitions: [
      AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT,
      AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT,
      AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT,
      AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
    ],
  },
  FRAUD_SUSPEND_ACCOUNT: {
    code: 1,
    state: {
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: false,
    },
    interventionName: AISInterventionTypes.AIS_ACCOUNT_SUSPENDED,
    allowedTransitions: [
      AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT,
      AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT,
      AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
    ],
  },
  // we have an issue, this action leads to the same state as unblock!! --> not an issue as this duplicate states always has the same allowed transitions
  FRAUD_UNSUSPEND_ACCOUNT: {
    code: 2,
    state: {
      blocked: false,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
    },
    interventionName: AISInterventionTypes.AIS_ACCOUNT_UNSUSPENDED,
    allowedTransitions: [
      AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT,
      AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
    ],
  },
  FRAUD_BLOCK_ACCOUNT: {
    code: 3,
    state: {
      blocked: true,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
    },
    allowedTransitions: [AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT],
    interventionName: AISInterventionTypes.AIS_ACCOUNT_BLOCKED,
  },
  FRAUD_UNBLOCK_ACCOUNT: {
    code: 7,
    state: {
      blocked: false,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
    },
    allowedTransitions: [
      AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT,
      AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT,
      AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
    ],
    interventionName: AISInterventionTypes.AIS_ACCOUNT_UNBLOCKED,
  },
  FRAUD_FORCED_USER_PASSWORD_RESET: {
    code: 4,
    state: {
      blocked: false,
      suspended: true,
      resetPassword: true,
      reproveIdentity: false,
    },
    allowedTransitions: [
      AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT,
      AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT,
      AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET, //need to check case where it is the same
      AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
    ],
    interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET,
  },
  FRAUD_FORCED_USER_IDENTITY_REVERIFICATION: {
    code: 5,
    state: {
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: true,
    },
    allowedTransitions: [
      AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT,
      AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT,
      AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
    ],
    interventionName: AISInterventionTypes.AIS_FORCED_USER_IDENTITY_VERIFY,
  },
  FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION: {
    code: 6,
    state: {
      blocked: false,
      suspended: true,
      resetPassword: true,
      reproveIdentity: true,
    },
    allowedTransitions: [
      AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT,
      AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT,
      AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
    ],
    interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY,
  },
};

export const userLedActionsConfigurations: UserLedActionTransitionConfigurations = {
  IPV_IDENTITY_ISSUED: {
    code: 8,
    state: {
      reproveIdentity: false,
    },
    allowedFromStates: [
      AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
    ],
  },
  AUTH_PASSWORD_RESET_SUCCESSFUL: {
    code: 9,
    state: {
      resetPassword: false,
    },
    allowedFromStates: [
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
    ],
  },
};
