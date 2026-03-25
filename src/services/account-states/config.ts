import { EventsEnum, AISInterventionTypes, PossibleAccountStatus, Codes } from '../../data-types/constants';
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
    [Codes.C01]: {
      to: PossibleAccountStatus.AccountIsSuspended,
      name: EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      interventionName: AISInterventionTypes.AIS_ACCOUNT_SUSPENDED,
    },
    [Codes.C02]: {
      to: PossibleAccountStatus.AccountIsOkay,
      name: EventsEnum.FRAUD_UNSUSPEND_ACCOUNT,
      interventionName: AISInterventionTypes.AIS_ACCOUNT_UNSUSPENDED,
    },
    [Codes.C03]: {
      to: PossibleAccountStatus.AccountIsBlocked,
      name: EventsEnum.FRAUD_BLOCK_ACCOUNT,
      interventionName: AISInterventionTypes.AIS_ACCOUNT_BLOCKED,
    },
    [Codes.C04]: {
      to: PossibleAccountStatus.AccountNeedsPasswordReset,
      name: EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET,
    },
    [Codes.C05]: {
      to: PossibleAccountStatus.AccountNeedsIdReset,
      name: EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
      interventionName: AISInterventionTypes.AIS_FORCED_USER_IDENTITY_VERIFY,
    },
    [Codes.C06]: {
      to: PossibleAccountStatus.AccountNeedsPswAndIdReset,
      name: EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
      interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY,
    },
    [Codes.C07]: {
      to: PossibleAccountStatus.AccountIsOkay,
      name: EventsEnum.FRAUD_UNBLOCK_ACCOUNT,
      interventionName: AISInterventionTypes.AIS_ACCOUNT_UNBLOCKED,
    },
    [Codes.C90]: {
      to: PossibleAccountStatus.AccountIsOkay,
      name: EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
    },
    [Codes.C91]: {
      to: PossibleAccountStatus.AccountIsOkay,
      name: EventsEnum.IPV_ACCOUNT_INTERVENTION_END,
    },
    [Codes.C92]: {
      to: PossibleAccountStatus.AccountNeedsPasswordReset,
      name: EventsEnum.IPV_ACCOUNT_INTERVENTION_END,
    },
    [Codes.C93]: {
      to: PossibleAccountStatus.AccountNeedsIdReset,
      name: EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
    },
    [Codes.C94]: {
      to: PossibleAccountStatus.AccountIsOkay,
      name: EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT,
    },
    [Codes.C95]: {
      to: PossibleAccountStatus.AccountNeedsIdReset,
      name: EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT,
    },
  },
  adjacency: {
    AccountIsOkay: [Codes.C01, Codes.C03, Codes.C04, Codes.C05, Codes.C06],
    AccountIsBlocked: [Codes.C07],
    AccountIsSuspended: [Codes.C02, Codes.C03, Codes.C04, Codes.C05, Codes.C06],
    AccountNeedsPasswordReset: [Codes.C01, Codes.C02, Codes.C03, Codes.C05, Codes.C06, Codes.C90, Codes.C94],
    AccountNeedsIdReset: [Codes.C01, Codes.C02, Codes.C03, Codes.C04, Codes.C06, Codes.C91],
    AccountNeedsPswAndIdReset: [Codes.C01, Codes.C02, Codes.C03, Codes.C04, Codes.C05, Codes.C92, Codes.C93, Codes.C95],
  },
};
