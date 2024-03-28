import { AccountStateEngine } from '../account-states/account-state-engine';
import { AISInterventionTypes, EventsEnum, MetricNames } from '../../data-types/constants';
import { StateEngineConfigurationError, StateTransitionError } from '../../data-types/errors';
import { addMetric } from '../../commons/metrics';
import { TransitionConfigurationInterface } from '../../data-types/interfaces';

const accountStateEngine = AccountStateEngine.getInstance();
const accountIsSuspended = {
  blocked: false,
  suspended: true,
  resetPassword: false,
  reproveIdentity: false,
};
const accountNeedsPswReset = {
  blocked: false,
  suspended: true,
  resetPassword: true,
  reproveIdentity: false,
};
const accountIsOkay = {
  blocked: false,
  suspended: false,
  resetPassword: false,
  reproveIdentity: false,
};
const accountNeedsIDReset = {
  blocked: false,
  suspended: true,
  resetPassword: false,
  reproveIdentity: true,
};
const accountNeedsIDResetAndPswReset = {
  blocked: false,
  suspended: true,
  resetPassword: true,
  reproveIdentity: true,
};
const accountIsBlocked = {
  blocked: true,
  suspended: false,
  resetPassword: false,
  reproveIdentity: false,
};
const blockAccountUpdate = {
  stateResult: {
    blocked: true,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
  },
  interventionName: AISInterventionTypes.AIS_ACCOUNT_BLOCKED,
  nextAllowableInterventions: ['07'],
};
const suspendAccountUpdate = {
  stateResult: {
    blocked: false,
    suspended: true,
    resetPassword: false,
    reproveIdentity: false,
  },
  interventionName: AISInterventionTypes.AIS_ACCOUNT_SUSPENDED,
  nextAllowableInterventions: ['02', '03', '04', '05', '06'],
};
const passwordResetRequiredUpdate = {
  stateResult: {
    blocked: false,
    suspended: true,
    resetPassword: true,
    reproveIdentity: false,
  },
  interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET,
  nextAllowableInterventions: ['01', '02', '03', '05', '06', '26', '90', '94'],
};
const idResetRequiredUpdate = {
  stateResult: {
    blocked: false,
    suspended: true,
    resetPassword: false,
    reproveIdentity: true,
  },
  interventionName: AISInterventionTypes.AIS_FORCED_USER_IDENTITY_VERIFY,
  nextAllowableInterventions: ['01', '02', '03', '04', '06', '91'],
};
const pswAndIdResetRequiredUpdate = {
  stateResult: {
    blocked: false,
    suspended: true,
    resetPassword: true,
    reproveIdentity: true,
  },
  interventionName: AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY,
  nextAllowableInterventions: ['01', '02', '03', '04', '05', '92', '93', '95'],
};
const unsuspendAccountUpdate = {
  stateResult: {
    blocked: false,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
  },
  interventionName: AISInterventionTypes.AIS_ACCOUNT_UNSUSPENDED,
  nextAllowableInterventions: ['01', '03', '04', '05', '06', '25'],
};
const unblockAccountUpdate = {
  stateResult: {
    blocked: false,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
  },
  interventionName: AISInterventionTypes.AIS_ACCOUNT_UNBLOCKED,
  nextAllowableInterventions: ['01', '03', '04', '05', '06', '25'],
};
const pswResetSuccessfulUpdateUnsuspended = {
  stateResult: {
    blocked: false,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
  },
  nextAllowableInterventions: ['01', '03', '04', '05', '06', '25'],
};
const pswResetSuccessfulUpdateSuspended = {
  stateResult: {
    blocked: false,
    suspended: true,
    resetPassword: false,
    reproveIdentity: true,
  },
  nextAllowableInterventions: ['01', '02', '03', '04', '06', '91'],
};
const idResetSuccessfulUpdateUnsuspended = {
  stateResult: {
    blocked: false,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
  },
  nextAllowableInterventions: ['01', '03', '04', '05', '06', '25'],
};
const idResetSuccessfulUpdateSuspended = {
  interventionName: undefined,
  stateResult: {
    blocked: false,
    suspended: true,
    resetPassword: true,
    reproveIdentity: false,
  },
  nextAllowableInterventions: ['01', '02', '03', '05', '06', '26', '90', '94'],
};

jest.mock('@aws-lambda-powertools/logger');
jest.mock('../../commons/metrics');
jest.mock('../../commons/get-current-timestamp', () => ({
  getCurrentTimestamp: jest.fn().mockImplementation(() => {
    return {
      milliseconds: 1_234_567_890,
      isoString: 'today',
      seconds: 1_234_567,
    };
  }),
}));
describe('account-state-service', () => {
  describe('Successful state transitions', () => {
    describe('from no intervention', () => {
      it.each([
        [EventsEnum.FRAUD_BLOCK_ACCOUNT, accountIsOkay, blockAccountUpdate],
        [EventsEnum.FRAUD_SUSPEND_ACCOUNT, accountIsOkay, suspendAccountUpdate],
        [EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET, accountIsOkay, passwordResetRequiredUpdate],
        [EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, accountIsOkay, idResetRequiredUpdate],
        [
          EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountIsOkay,
          pswAndIdResetRequiredUpdate,
        ],
        [
          EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION,
          accountIsOkay,
          idResetRequiredUpdate,
        ],
      ])('%p', (intervention, retrievedAccountState, command) => {
        const partialCommand = accountStateEngine.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from unsuspended', () => {
      it.each([
        [EventsEnum.FRAUD_BLOCK_ACCOUNT, accountIsOkay, blockAccountUpdate],
        [EventsEnum.FRAUD_SUSPEND_ACCOUNT, accountIsOkay, suspendAccountUpdate],
        [EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET, accountIsOkay, passwordResetRequiredUpdate],
        [EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, accountIsOkay, idResetRequiredUpdate],
        [
          EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountIsOkay,
          pswAndIdResetRequiredUpdate,
        ],
        [
          EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION,
          accountIsOkay,
          idResetRequiredUpdate,
        ]
      ])('%p', (intervention, retrievedAccountState, command) => {
        const partialCommand = accountStateEngine.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from suspended no user action', () => {
      it.each([
        [EventsEnum.FRAUD_UNSUSPEND_ACCOUNT, accountIsSuspended, unsuspendAccountUpdate],
        [EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET, accountIsSuspended, passwordResetRequiredUpdate],
        [EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, accountIsSuspended, idResetRequiredUpdate],
        [
          EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountIsSuspended,
          pswAndIdResetRequiredUpdate,
        ],
        [EventsEnum.FRAUD_BLOCK_ACCOUNT, accountIsSuspended, blockAccountUpdate],
      ])('%p', (intervention, retrievedAccountState, command) => {
        const partialCommand = accountStateEngine.applyEventTransition(intervention, retrievedAccountState);
        expect(addMetric).not.toHaveBeenCalled();
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from suspended psw reset required', () => {
      it.each([
        [EventsEnum.FRAUD_BLOCK_ACCOUNT, accountNeedsPswReset, blockAccountUpdate],
        [EventsEnum.FRAUD_UNSUSPEND_ACCOUNT, accountNeedsPswReset, unsuspendAccountUpdate],
        [EventsEnum.FRAUD_SUSPEND_ACCOUNT, accountNeedsPswReset, suspendAccountUpdate],
        [EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accountNeedsPswReset, pswResetSuccessfulUpdateUnsuspended],
        [
          EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT,
          accountNeedsPswReset,
          pswResetSuccessfulUpdateUnsuspended,
        ],
        [EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, accountNeedsPswReset, idResetRequiredUpdate],
        [
          EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountNeedsPswReset,
          pswAndIdResetRequiredUpdate,
        ],
        [
          EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_OPERATIONAL_IDENTITY_REVERIFICATION,
          accountNeedsPswReset,
          pswAndIdResetRequiredUpdate,
        ],
      ])('%p', (intervention, retrievedAccountState, command) => {
        const partialCommand = accountStateEngine.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from suspended id reset required', () => {
      it.each([
        [
          EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountNeedsIDReset,
          pswAndIdResetRequiredUpdate,
        ],
        [EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET, accountNeedsIDReset, passwordResetRequiredUpdate],
        [EventsEnum.FRAUD_SUSPEND_ACCOUNT, accountNeedsIDReset, suspendAccountUpdate],
        [EventsEnum.FRAUD_UNSUSPEND_ACCOUNT, accountNeedsIDReset, unsuspendAccountUpdate],
        [EventsEnum.IPV_IDENTITY_ISSUED, accountNeedsIDReset, idResetSuccessfulUpdateUnsuspended],
        [EventsEnum.FRAUD_BLOCK_ACCOUNT, accountNeedsIDReset, blockAccountUpdate],
      ])('%p', (intervention, retrievedAccountState, command) => {
        const partialCommand = accountStateEngine.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from suspended psw & id reset required', () => {
      it.each([
        [EventsEnum.FRAUD_BLOCK_ACCOUNT, accountNeedsIDResetAndPswReset, blockAccountUpdate],
        [EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, accountNeedsIDResetAndPswReset, idResetRequiredUpdate],
        [EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accountNeedsIDResetAndPswReset, pswResetSuccessfulUpdateSuspended],
        [
          EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT,
          accountNeedsIDResetAndPswReset,
          pswResetSuccessfulUpdateSuspended,
        ],
        [EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET, accountNeedsIDResetAndPswReset, passwordResetRequiredUpdate],
        [EventsEnum.IPV_IDENTITY_ISSUED, accountNeedsIDResetAndPswReset, idResetSuccessfulUpdateSuspended],
        [EventsEnum.FRAUD_UNSUSPEND_ACCOUNT, accountNeedsIDResetAndPswReset, unsuspendAccountUpdate],
        [EventsEnum.FRAUD_SUSPEND_ACCOUNT, accountNeedsIDResetAndPswReset, suspendAccountUpdate],
      ])('%p', (intervention, retrievedAccountState, command) => {
        const partialCommand = accountStateEngine.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from blocked', () => {
      it.each([
        [EventsEnum.FRAUD_UNBLOCK_ACCOUNT, accountIsBlocked, unblockAccountUpdate],
      ])(
        '%p',
        (intervention, retrievedAccountState, command) => {
          const partialCommand = accountStateEngine.applyEventTransition(intervention, retrievedAccountState);
          expect(partialCommand).toEqual(command);
        },
      );
    });
  });

  describe('get intervention enum from code', () => {
    it('should return the expected account state given a valid code', () => {
      const expectedState = EventsEnum.FRAUD_BLOCK_ACCOUNT;
      expect(accountStateEngine.getInterventionEnumFromCode('03')).toEqual(expectedState);
    });
    it('should throw a configuration error if code cannot be found in current configurations', () => {
      expect(() => accountStateEngine.getInterventionEnumFromCode('111')).toThrow(
        new StateEngineConfigurationError('code: 111 is not found in current configuration'),
      );
    });
  });

  describe('Unsuccessful state transitions', () => {
    describe('received intervention is not allowed on current account state', () => {
      it.each([
        [EventsEnum.FRAUD_UNSUSPEND_ACCOUNT, accountIsOkay],
        [EventsEnum.FRAUD_UNBLOCK_ACCOUNT, accountIsOkay],
        [EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accountIsOkay],
        [EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT, accountIsOkay],
        [EventsEnum.IPV_IDENTITY_ISSUED, accountIsOkay],

        [EventsEnum.FRAUD_UNBLOCK_ACCOUNT, accountIsSuspended],
        [EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accountIsSuspended],
        [EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT, accountIsSuspended],
        [EventsEnum.IPV_IDENTITY_ISSUED, accountIsSuspended],
        [EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION, accountIsSuspended],

        [EventsEnum.FRAUD_UNBLOCK_ACCOUNT, accountNeedsPswReset],
        [EventsEnum.IPV_IDENTITY_ISSUED, accountNeedsPswReset],

        [EventsEnum.FRAUD_UNBLOCK_ACCOUNT, accountNeedsIDReset],
        [EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accountNeedsIDReset],
        [EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT, accountNeedsIDReset],
        [EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION, accountNeedsIDReset],

        [EventsEnum.FRAUD_UNBLOCK_ACCOUNT, accountNeedsIDResetAndPswReset],

        [EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accountIsBlocked],
        [EventsEnum.IPV_IDENTITY_ISSUED, accountIsBlocked],
        [EventsEnum.FRAUD_UNSUSPEND_ACCOUNT, accountIsBlocked],
        [EventsEnum.FRAUD_SUSPEND_ACCOUNT, accountIsBlocked],
        [EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET, accountIsBlocked],
        [EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, accountIsBlocked],
        [EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION, accountIsBlocked],
        [EventsEnum.OPERATIONAL_FORCED_USER_IDENTITY_REVERIFICATION, accountIsBlocked],
      ])('%p applied on account state: %p', (intervention, retrievedAccountState) => {
        expect(() => accountStateEngine.applyEventTransition(intervention, retrievedAccountState)).toThrow(
          new StateTransitionError(`${intervention} is not allowed from current state`, intervention, {
            nextAllowableInterventions: [],
            stateResult: retrievedAccountState,
            interventionName: AISInterventionTypes.AIS_NO_INTERVENTION,
          }),
        );
      });
    });
    describe('current state account could not be found in current config', () => {
      it('should throw if an unexpected account state is received', () => {
        const unexpectedAccountState = {
          blocked: true,
          suspended: true,
          reproveIdentity: true,
          resetPassword: true,
        };
        expect(() =>
          accountStateEngine.applyEventTransition(EventsEnum.FRAUD_BLOCK_ACCOUNT, unexpectedAccountState),
        ).toThrow(new StateEngineConfigurationError('Account state does not exists in current configuration.'));
        expect(addMetric).toHaveBeenLastCalledWith(MetricNames.STATE_NOT_FOUND_IN_CURRENT_CONFIG);
      });
    });
  });

  describe('Configuration errors', () => {
    it('should throw when given code cannot be found in configuration', () => {
      expect(() => accountStateEngine.getInterventionEnumFromCode('111')).toThrow(
        new StateEngineConfigurationError('code: 111 is not found in current configuration'),
      );
      expect(addMetric).toHaveBeenLastCalledWith(MetricNames.INTERVENTION_CODE_NOT_FOUND_IN_CONFIG);
    });
    it('should throw when the computed state is the same as the current state', () => {
      const invalidConfig: TransitionConfigurationInterface = {
        nodes: {
          AccountIsOkay: {
            blocked: false,
            suspended: false,
            resetPassword: false,
            reproveIdentity: false,
          },
          AccountIsBlocked: {
            blocked: false,
            suspended: false,
            resetPassword: false,
            reproveIdentity: false,
          },
        },
        adjacency: {
          AccountIsOkay: ['01'],
        },
        edges: {
          '01': {
            to: 'AccountIsBlocked',
            name: EventsEnum.FRAUD_BLOCK_ACCOUNT,
            interventionName: AISInterventionTypes.AIS_ACCOUNT_BLOCKED,
          },
        },
      };
      Object.defineProperty(AccountStateEngine, 'configuration', {
        writable: true,
        value: invalidConfig,
      });

      expect(() => accountStateEngine.applyEventTransition(EventsEnum.FRAUD_BLOCK_ACCOUNT, accountIsOkay)).toThrow(
        new StateTransitionError(
          'Computed new state is the same as the current state.',
          EventsEnum.FRAUD_BLOCK_ACCOUNT,
          {
            nextAllowableInterventions: [],
            interventionName: AISInterventionTypes.AIS_NO_INTERVENTION,
            stateResult: accountIsOkay,
          },
        ),
      );
      expect(addMetric).toHaveBeenLastCalledWith(MetricNames.TRANSITION_SAME_AS_CURRENT_STATE);
    });
    it('should throw when there are no configured transitions for a given state', () => {
      const invalidConfig: TransitionConfigurationInterface = {
        nodes: {
          AccountIsOkay: {
            blocked: false,
            suspended: false,
            resetPassword: false,
            reproveIdentity: false,
          },
          AccountIsBlocked: {
            blocked: false,
            suspended: false,
            resetPassword: false,
            reproveIdentity: false,
          },
        },
        adjacency: {
          AccountIsOkay: ['01'],
        },
        edges: {
          '01': {
            to: 'AccountIsBlocked',
            name: EventsEnum.FRAUD_BLOCK_ACCOUNT,
            interventionName: AISInterventionTypes.AIS_ACCOUNT_BLOCKED,
          },
        },
      };
      Object.defineProperty(AccountStateEngine, 'configuration', {
        writable: true,
        value: invalidConfig,
      });

      expect(() => accountStateEngine.applyEventTransition(EventsEnum.FRAUD_UNBLOCK_ACCOUNT, accountIsBlocked)).toThrow(
        new StateEngineConfigurationError(
          'There are no allowed transitions from state AccountIsBlocked in current configurations',
        ),
      );
      expect(addMetric).toHaveBeenLastCalledWith(MetricNames.NO_TRANSITIONS_FOUND_IN_CONFIG);
    });
    it('should throw when the proposed transition points to a non-existing state in current config', () => {
      const invalidConfig: TransitionConfigurationInterface = {
        nodes: {
          AccountIsOkay: {
            blocked: false,
            suspended: false,
            resetPassword: false,
            reproveIdentity: false,
          },
          AccountIsBlocked: {
            blocked: false,
            suspended: false,
            resetPassword: false,
            reproveIdentity: false,
          },
        },
        adjacency: {
          AccountIsOkay: ['01'],
        },
        edges: {
          '01': {
            to: 'AccountIsNotOkay',
            name: EventsEnum.FRAUD_BLOCK_ACCOUNT,
            interventionName: AISInterventionTypes.AIS_ACCOUNT_BLOCKED,
          },
        },
      };
      Object.defineProperty(AccountStateEngine, 'configuration', {
        writable: true,
        value: invalidConfig,
      });

      expect(() => accountStateEngine.applyEventTransition(EventsEnum.FRAUD_BLOCK_ACCOUNT, accountIsOkay)).toThrow(
        new StateEngineConfigurationError('state AccountIsNotOkay not found in current config.'),
      );
      expect(addMetric).toHaveBeenLastCalledWith(MetricNames.STATE_NOT_FOUND_IN_CURRENT_CONFIG);
    });
    it('should throw when the the configuration object fails validation because not all nodes have an adjacency list', () => {
      const invalidConfig: TransitionConfigurationInterface = {
        nodes: {
          AccountIsOkay: {
            blocked: false,
            suspended: false,
            resetPassword: false,
            reproveIdentity: false,
          },
          AccountIsBlocked: {
            blocked: false,
            suspended: false,
            resetPassword: false,
            reproveIdentity: false,
          },
        },
        adjacency: {
          AccountIsOkay: ['01'],
        },
        edges: {
          '01': {
            to: 'AccountIsOkay',
            name: EventsEnum.FRAUD_BLOCK_ACCOUNT,
            interventionName: AISInterventionTypes.AIS_ACCOUNT_BLOCKED,
          },
        },
      };
      Object.defineProperty(AccountStateEngine, 'instance', {
        writable: true,
        value: undefined,
      });
      Object.defineProperty(AccountStateEngine, 'configuration', {
        writable: true,
        value: invalidConfig,
      });

      expect(() => AccountStateEngine.getInstance()).toThrow(
        new StateEngineConfigurationError('Invalid state engine configuration detected. Adjacency mismatch'),
      );
      expect(addMetric).toHaveBeenLastCalledWith(MetricNames.INVALID_STATE_ENGINE_CONFIGURATION);
    });
    it('should throw when the the configuration object fails validation because at least one edge points to a non-existing node', () => {
      const invalidConfig: TransitionConfigurationInterface = {
        nodes: {
          AccountIsOkay: {
            blocked: false,
            suspended: false,
            resetPassword: false,
            reproveIdentity: false,
          },
          AccountIsBlocked: {
            blocked: false,
            suspended: false,
            resetPassword: false,
            reproveIdentity: false,
          },
        },
        adjacency: {
          AccountIsOkay: ['01'],
          AccountIsBlocked: ['01'],
        },
        edges: {
          '01': {
            to: 'AccountIsNotOkay',
            name: EventsEnum.FRAUD_BLOCK_ACCOUNT,
            interventionName: AISInterventionTypes.AIS_ACCOUNT_BLOCKED,
          },
        },
      };
      Object.defineProperty(AccountStateEngine, 'instance', {
        writable: true,
        value: undefined,
      });
      Object.defineProperty(AccountStateEngine, 'configuration', {
        writable: true,
        value: invalidConfig,
      });

      expect(() => AccountStateEngine.getInstance()).toThrow(
        new StateEngineConfigurationError('Invalid state engine configuration detected. Edge mismatch'),
      );
      expect(addMetric).toHaveBeenLastCalledWith(MetricNames.INVALID_STATE_ENGINE_CONFIGURATION);
    });
  });
});
