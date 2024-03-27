import { EventsEnum, AISInterventionTypes } from '../../data-types/constants';
import { TransitionConfigurationInterface } from '../../data-types/interfaces';

/**
 * Graph like configuration object for Account State Engine class
 * nodes represent the possible account states
 * edges are the possible transition to a new state given a specific event
 * adjacency contains the adjacency list for each account state, representing what transitions are allowed on any given state
 */
export const transitionConfiguration: TransitionConfigurationInterface = {
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
    '01': {
      to: 'AccountIsSuspended',
      name: EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      interventionName: AISInterventionTypes.AIS_ACCOUNT_SUSPENDED,
    },
    '02': {
      to: 'AccountIsOkay',
      name: EventsEnum.FRAUD_UNSUSPEND_ACCOUNT,
      interventionName: AISInterventionTypes.AIS_ACCOUNT_UNSUSPENDED,
    },
    '03': {
      to: 'AccountIsBlocked',
      name: EventsEnum.FRAUD_BLOCK_ACCOUNT,
      interventionName: AISInterventionTypes.AIS_ACCOUNT_BLOCKED,
    },
    '04': {
      to: 'AccountNeedsPasswordReset',
      name: EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET,
    },
    '05': {
      to: 'AccountNeedsIdReset',
      name: EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      interventionName: AISInterventionTypes.AIS_FORCED_USER_IDENTITY_VERIFY,
    },
    '06': {
      to: 'AccountNeedsPswAndIdReset',
      name: EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
      interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY,
    },
    '07': {
      to: 'AccountIsOkay',
      name: EventsEnum.FRAUD_UNBLOCK_ACCOUNT,
      interventionName: AISInterventionTypes.AIS_ACCOUNT_UNBLOCKED,
    },
    '25': {
      to: 'AccountNeedsIdReset',
      name: EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION,
      interventionName: AISInterventionTypes.AIS_FORCED_USER_IDENTITY_VERIFY,
    },
    '90': {
      to: 'AccountIsOkay',
      name: EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
    },
    '91': {
      to: 'AccountIsOkay',
      name: EventsEnum.IPV_IDENTITY_ISSUED,
    },
    '92': {
      to: 'AccountNeedsPasswordReset',
      name: EventsEnum.IPV_IDENTITY_ISSUED,
    },
    '93': {
      to: 'AccountNeedsIdReset',
      name: EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
    },
    '94': {
      to: 'AccountIsOkay',
      name: EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT,
    },
    '95': {
      to: 'AccountNeedsIdReset',
      name: EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT,
    },
  },
  adjacency: {
    AccountIsOkay: ['01', '03', '04', '05', '06', '25'],
    AccountIsBlocked: ['07'],
    AccountIsSuspended: ['02', '03', '04', '05', '06'],
    AccountNeedsPasswordReset: ['01', '02', '03', '05', '06', '90', '94'],
    AccountNeedsIdReset: ['01', '02', '03', '04', '06', '91'],
    AccountNeedsPswAndIdReset: ['01', '02', '03', '04', '05', '92', '93', '95'],
  },
};
