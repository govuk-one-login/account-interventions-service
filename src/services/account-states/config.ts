import { EventsEnum, AISInterventionTypes } from '../../data-types/constants';
import { TransitionConfigurationInterface } from '../../data-types/interfaces';
export const graph: TransitionConfigurationInterface = {
  nodes: {
    AccountIsOkay: {
      blocked: false,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
    },
    AccountIsBlocked: {
      blocked: true,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
    },
    AccountIsSuspended: {
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: false,
    },
    AccountNeedsPasswordReset: {
      blocked: false,
      suspended: true,
      resetPassword: true,
      reproveIdentity: false,
    },
    AccountNeedsIdReset: {
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: true,
    },
    AccountNeedsPswAndIdReset: {
      blocked: false,
      suspended: true,
      resetPassword: true,
      reproveIdentity: true,
    },
  },
  edges: {
    1: {
      to: 'AccountIsSuspended',
      name: EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      interventionName: AISInterventionTypes.AIS_ACCOUNT_SUSPENDED,
    },
    2: {
      to: 'AccountIsOkay',
      name: EventsEnum.FRAUD_UNSUSPEND_ACCOUNT,
      interventionName: AISInterventionTypes.AIS_ACCOUNT_UNSUSPENDED,
    },
    3: {
      to: 'AccountIsBlocked',
      name: EventsEnum.FRAUD_BLOCK_ACCOUNT,
      interventionName: AISInterventionTypes.AIS_ACCOUNT_BLOCKED,
    },
    4: {
      to: 'AccountNeedsPasswordReset',
      name: EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET,
    },
    5: {
      to: 'AccountNeedsIdReset',
      name: EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      interventionName: AISInterventionTypes.AIS_FORCED_USER_IDENTITY_VERIFY,
    },
    6: {
      to: 'AccountNeedsPswAndIdReset',
      name: EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
      interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY,
    },
    7: {
      to: 'AccountIsOkay',
      name: EventsEnum.FRAUD_UNBLOCK_ACCOUNT,
      interventionName: AISInterventionTypes.AIS_ACCOUNT_UNBLOCKED,
    },
    90: {
      to: 'AccountIsOkay',
      name: EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
    },
    91: {
      to: 'AccountIsOkay',
      name: EventsEnum.IPV_IDENTITY_ISSUED,
    },
    92: {
      to: 'AccountNeedsPasswordReset',
      name: EventsEnum.IPV_IDENTITY_ISSUED,
    },
    93: {
      to: 'AccountNeedsIdReset',
      name: EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
    },
  },
  adjacency: {
    AccountIsOkay: [1, 3, 4, 5, 6],
    AccountIsBlocked: [7],
    AccountIsSuspended: [2, 3, 4, 5, 6],
    AccountNeedsPasswordReset: [1, 2, 3, 5, 6, 90],
    AccountNeedsIdReset: [1, 2, 3, 4, 6, 91],
    AccountNeedsPswAndIdReset: [1, 2, 3, 4, 5, 92, 93],
  },
};
