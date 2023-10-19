import { AccountStateEventEnum, AISInterventionTypes } from '../../data-types/constants';
import { TransitionConfiguration } from '../../data-types/interfaces';

export const transitionConfig: TransitionConfiguration = {
  FRAUD_SUSPEND_ACCOUNT: {
    code: 1,
    state: {
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: false,
    },
    allowedTransitions: [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT],
    interventionName: AISInterventionTypes.AIS_ACCOUNT_SUSPENDED,
  },
  FRAUD_UNSUSPEND_ACCOUNT: {
    code: 2,
    state: {
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: false,
    },
    allowedTransitions: [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT],
    interventionName: AISInterventionTypes.AIS_ACCOUNT_UNSUSPENDED,
  },
  FRAUD_BLOCK_ACCOUNT: {
    code: 3,
    state: {
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: false,
    },
    allowedTransitions: [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT],
    interventionName: AISInterventionTypes.AIS_ACCOUNT_BLOCKED,
  },
  FRAUD_UNBLOCK_ACCOUNT: {
    code: 7,
    state: {
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: false,
    },
    allowedTransitions: [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT],
    interventionName: AISInterventionTypes.AIS_ACCOUNT_UNBLOCKED,
  },
  FRAUD_FORCED_USER_PASSWORD_RESET: {
    code: 4,
    state: {
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: false,
    },
    allowedTransitions: [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT],
    interventionName: AISInterventionTypes.AIS_FORCE_USER_PASSWORD_RESET,
  },
  FRAUD_FORCED_USER_IDENTITY_REVERIFICATION: {
    code: 5,
    state: {
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: false,
    },
    allowedTransitions: [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT],
    interventionName: AISInterventionTypes.AIS_FORCED_USER_IDENTITY_VERIFY,
  },
  FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION: {
    code: 6,
    state: {
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: false,
    },
    allowedTransitions: [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT],
    interventionName: AISInterventionTypes.AIS_FORCE_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY,
  },
  IPV_IDENTITY_ISSUED: {
    code: 8,
    state: {
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: false,
    },
    allowedTransitions: [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT],
  },
  AUTH_PASSWORD_RESET_SUCCESSFUL: {
    code: 9,
    state: {
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: false,
    },
    allowedTransitions: [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT],
  },
};
