import { EventsEnum, AISInterventionTypes } from '../../data-types/constants';
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
      EventsEnum.FRAUD_BLOCK_ACCOUNT,
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
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
      EventsEnum.FRAUD_UNSUSPEND_ACCOUNT,
      EventsEnum.FRAUD_BLOCK_ACCOUNT,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
    ],
  },
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
      EventsEnum.FRAUD_BLOCK_ACCOUNT,
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
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
    allowedTransitions: [EventsEnum.FRAUD_UNBLOCK_ACCOUNT],
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
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      EventsEnum.FRAUD_BLOCK_ACCOUNT,
      EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
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
      EventsEnum.FRAUD_BLOCK_ACCOUNT,
      EventsEnum.FRAUD_UNSUSPEND_ACCOUNT,
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
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
      EventsEnum.FRAUD_BLOCK_ACCOUNT,
      EventsEnum.FRAUD_UNSUSPEND_ACCOUNT,
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
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
      EventsEnum.FRAUD_BLOCK_ACCOUNT,
      EventsEnum.FRAUD_UNSUSPEND_ACCOUNT,
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
    ],
    interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY,
  },
};

export const userLedActionsConfig: UserLedActionTransitionConfigurations = {
  IPV_IDENTITY_ISSUED: {
    code: 98,
    state: {
      reproveIdentity: false,
    },
    allowedFromStates: [
      EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
    ],
  },
  AUTH_PASSWORD_RESET_SUCCESSFUL: {
    code: 99,
    state: {
      resetPassword: false,
    },
    allowedFromStates: [
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
    ],
  },
};
