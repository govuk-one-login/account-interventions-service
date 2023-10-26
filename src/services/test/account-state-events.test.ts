import { AccountStateEvents } from '../account-states/account-state-events';
import { AccountStateEventEnum, MetricNames } from '../../data-types/constants';
import { StateTransitionErrorIgnored } from '../../data-types/errors';
import { logAndPublishMetric } from '../../commons/metrics';

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

const accountNeedsIDResetAdnPswReset = {
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
  ExpressionAttributeNames: {
    '#B': 'blocked',
    '#S': 'suspended',
    '#RP': 'resetPassword',
    '#RI': 'reproveIdentity',
    '#UA': 'updatedAt',
    '#INT': 'intervention',
    '#AA': 'appliedAt',
    '#H': 'history',
  },
  ExpressionAttributeValues: {
    ':b': { BOOL: true },
    ':s': { BOOL: false },
    ':rp': { BOOL: false },
    ':ri': { BOOL: false },
    ':ua': { N: '1234567890' },
    ':int': { S: 'AIS_ACCOUNT_BLOCKED' },
    ':aa': { N: '1234567890' },
    ':empty_list': { L: [] },
    ':h': { L: [{ S: 'AIS_ACCOUNT_BLOCKED' }] },
  },
  UpdateExpression:
    'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
};

const unblockAccountUpdate = {
  ExpressionAttributeNames: {
    '#B': 'blocked',
    '#S': 'suspended',
    '#RP': 'resetPassword',
    '#RI': 'reproveIdentity',
    '#UA': 'updatedAt',
    '#INT': 'intervention',
    '#AA': 'appliedAt',
    '#H': 'history',
  },
  ExpressionAttributeValues: {
    ':b': { BOOL: false },
    ':s': { BOOL: false },
    ':rp': { BOOL: false },
    ':ri': { BOOL: false },
    ':ua': { N: '1234567890' },
    ':int': { S: 'AIS_ACCOUNT_UNBLOCKED' },
    ':aa': { N: '1234567890' },
    ':empty_list': { L: [] },
    ':h': { L: [{ S: 'AIS_ACCOUNT_UNBLOCKED' }] },
  },
  UpdateExpression:
    'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
};

const suspendAccountUpdate = {
  ExpressionAttributeNames: {
    '#B': 'blocked',
    '#S': 'suspended',
    '#RP': 'resetPassword',
    '#RI': 'reproveIdentity',
    '#UA': 'updatedAt',
    '#INT': 'intervention',
    '#AA': 'appliedAt',
    '#H': 'history',
  },
  ExpressionAttributeValues: {
    ':b': { BOOL: false },
    ':s': { BOOL: true },
    ':rp': { BOOL: false },
    ':ri': { BOOL: false },
    ':ua': { N: '1234567890' },
    ':int': { S: 'AIS_ACCOUNT_SUSPENDED' },
    ':aa': { N: '1234567890' },
    ':empty_list': { L: [] },
    ':h': { L: [{ S: 'AIS_ACCOUNT_SUSPENDED' }] },
  },
  UpdateExpression:
    'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
};

const unsuspendAccountUpdate = {
  ExpressionAttributeNames: {
    '#B': 'blocked',
    '#S': 'suspended',
    '#RP': 'resetPassword',
    '#RI': 'reproveIdentity',
    '#UA': 'updatedAt',
    '#INT': 'intervention',
    '#AA': 'appliedAt',
    '#H': 'history',
  },
  ExpressionAttributeValues: {
    ':b': { BOOL: false },
    ':s': { BOOL: false },
    ':rp': { BOOL: false },
    ':ri': { BOOL: false },
    ':ua': { N: '1234567890' },
    ':int': { S: 'AIS_ACCOUNT_UNSUSPENDED' },
    ':aa': { N: '1234567890' },
    ':empty_list': { L: [] },
    ':h': { L: [{ S: 'AIS_ACCOUNT_UNSUSPENDED' }] },
  },
  UpdateExpression:
    'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
};

const passwordResetRequiredUpdate = {
  ExpressionAttributeNames: {
    '#B': 'blocked',
    '#S': 'suspended',
    '#RP': 'resetPassword',
    '#RI': 'reproveIdentity',
    '#UA': 'updatedAt',
    '#INT': 'intervention',
    '#AA': 'appliedAt',
    '#H': 'history',
  },
  ExpressionAttributeValues: {
    ':b': { BOOL: false },
    ':s': { BOOL: true },
    ':rp': { BOOL: true },
    ':ri': { BOOL: false },
    ':ua': { N: '1234567890' },
    ':int': { S: 'AIS_FORCED_USER_PASSWORD_RESET' },
    ':aa': { N: '1234567890' },
    ':empty_list': { L: [] },
    ':h': { L: [{ S: 'AIS_FORCED_USER_PASSWORD_RESET' }] },
  },
  UpdateExpression:
    'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
};

const idResetRequiredUpdate = {
  ExpressionAttributeNames: {
    '#B': 'blocked',
    '#S': 'suspended',
    '#RP': 'resetPassword',
    '#RI': 'reproveIdentity',
    '#UA': 'updatedAt',
    '#INT': 'intervention',
    '#AA': 'appliedAt',
    '#H': 'history',
  },
  ExpressionAttributeValues: {
    ':b': { BOOL: false },
    ':s': { BOOL: true },
    ':rp': { BOOL: false },
    ':ri': { BOOL: true },
    ':ua': { N: '1234567890' },
    ':int': { S: 'AIS_FORCED_USER_IDENTITY_VERIFY' },
    ':aa': { N: '1234567890' },
    ':empty_list': { L: [] },
    ':h': { L: [{ S: 'AIS_FORCED_USER_IDENTITY_VERIFY' }] },
  },
  UpdateExpression:
    'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
};

const pswAndIdResetRequiredUpdate = {
  ExpressionAttributeNames: {
    '#B': 'blocked',
    '#S': 'suspended',
    '#RP': 'resetPassword',
    '#RI': 'reproveIdentity',
    '#UA': 'updatedAt',
    '#INT': 'intervention',
    '#AA': 'appliedAt',
    '#H': 'history',
  },
  ExpressionAttributeValues: {
    ':b': { BOOL: false },
    ':s': { BOOL: true },
    ':rp': { BOOL: true },
    ':ri': { BOOL: true },
    ':ua': { N: '1234567890' },
    ':int': { S: 'AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY' },
    ':aa': { N: '1234567890' },
    ':empty_list': { L: [] },
    ':h': { L: [{ S: 'AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY' }] },
  },
  UpdateExpression:
    'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
};

const pswResetSuccessfulUpdateUnsuspended = {
  ExpressionAttributeNames: {
    '#B': 'blocked',
    '#S': 'suspended',
    '#RP': 'resetPassword',
    '#RI': 'reproveIdentity',
    '#UA': 'updatedAt',
    '#RPswdA': 'resetPasswordAt',
  },
  ExpressionAttributeValues: {
    ':b': { BOOL: false },
    ':s': { BOOL: false },
    ':rp': { BOOL: false },
    ':ri': { BOOL: false },
    ':ua': { N: '1234567890' },
    ':rpswda': { N: '1234567890' },
  },
  UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #RPswdA = :rpswda',
};

const pswResetSuccessfulUpdateSuspended = {
  ExpressionAttributeNames: {
    '#B': 'blocked',
    '#S': 'suspended',
    '#RP': 'resetPassword',
    '#RI': 'reproveIdentity',
    '#UA': 'updatedAt',
    '#RPswdA': 'resetPasswordAt',
  },
  ExpressionAttributeValues: {
    ':b': { BOOL: false },
    ':s': { BOOL: true },
    ':rp': { BOOL: false },
    ':ri': { BOOL: true },
    ':ua': { N: '1234567890' },
    ':rpswda': { N: '1234567890' },
  },
  UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #RPswdA = :rpswda',
};

const idResetSuccessfulUpdateUnsuspended = {
  ExpressionAttributeNames: {
    '#B': 'blocked',
    '#S': 'suspended',
    '#RP': 'resetPassword',
    '#RI': 'reproveIdentity',
    '#UA': 'updatedAt',
    '#RIdA': 'reprovedIdentityAt',
  },
  ExpressionAttributeValues: {
    ':b': { BOOL: false },
    ':s': { BOOL: false },
    ':rp': { BOOL: false },
    ':ri': { BOOL: false },
    ':ua': { N: '1234567890' },
    ':rida': { N: '1234567890' },
  },
  UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #RIdA = :rida',
};

const idResetSuccessfulUpdateSuspended = {
  ExpressionAttributeNames: {
    '#B': 'blocked',
    '#S': 'suspended',
    '#RP': 'resetPassword',
    '#RI': 'reproveIdentity',
    '#UA': 'updatedAt',
    '#RIdA': 'reprovedIdentityAt',
  },
  ExpressionAttributeValues: {
    ':b': { BOOL: false },
    ':s': { BOOL: true },
    ':rp': { BOOL: true },
    ':ri': { BOOL: false },
    ':ua': { N: '1234567890' },
    ':rida': { N: '1234567890' },
  },
  UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #RIdA = :rida',
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
        [AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, undefined, blockAccountUpdate],
        [AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, undefined, suspendAccountUpdate],
        [AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET, undefined, passwordResetRequiredUpdate],
        [AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, undefined, idResetRequiredUpdate],
        [
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          undefined,
          pswAndIdResetRequiredUpdate,
        ],
      ])('%p', (intervention, retrievedAccountState, command) => {
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from unsuspended', () => {
      it.each([
        [AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, accountIsOkay, blockAccountUpdate],
        [AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accountIsOkay, suspendAccountUpdate],
        [AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET, accountIsOkay, passwordResetRequiredUpdate],
        [AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, accountIsOkay, idResetRequiredUpdate],
        [
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountIsOkay,
          pswAndIdResetRequiredUpdate,
        ],
      ])('%p', (intervention, retrievedAccountState, command) => {
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from suspended no user action', () => {
      it.each([
        [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, accountIsSuspended, unsuspendAccountUpdate],
        [AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET, accountIsSuspended, passwordResetRequiredUpdate],
        [AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, accountIsSuspended, idResetRequiredUpdate],
        [
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountIsSuspended,
          pswAndIdResetRequiredUpdate,
        ],
        [AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, accountIsSuspended, blockAccountUpdate],
      ])('%p', (intervention, retrievedAccountState, command) => {
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        expect(logAndPublishMetric).not.toHaveBeenCalled();
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from suspended psw reset required', () => {
      it.each([
        [AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, accountNeedsPswReset, blockAccountUpdate],
        [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, accountNeedsPswReset, unsuspendAccountUpdate],
        [AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accountNeedsPswReset, suspendAccountUpdate],
        [
          AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
          accountNeedsPswReset,
          pswResetSuccessfulUpdateUnsuspended,
        ],
        [AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, accountNeedsPswReset, idResetRequiredUpdate],
        [
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountNeedsPswReset,
          pswAndIdResetRequiredUpdate,
        ],
      ])('%p', (intervention, retrievedAccountState, command) => {
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from suspended id reset required', () => {
      it.each([
        [
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountNeedsIDReset,
          pswAndIdResetRequiredUpdate,
        ],
        [AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET, accountNeedsIDReset, passwordResetRequiredUpdate],
        [AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accountNeedsIDReset, suspendAccountUpdate],
        [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, accountNeedsIDReset, unsuspendAccountUpdate],
        [AccountStateEventEnum.IPV_IDENTITY_ISSUED, accountNeedsIDReset, idResetSuccessfulUpdateUnsuspended],
        [AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, accountNeedsIDReset, blockAccountUpdate],
      ])('%p', (intervention, retrievedAccountState, command) => {
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from suspended psw & id reset required', () => {
      it.each([
        [AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, accountNeedsIDResetAdnPswReset, blockAccountUpdate],
        [
          AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
          accountNeedsIDResetAdnPswReset,
          idResetRequiredUpdate,
        ],
        [
          AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
          accountNeedsIDResetAdnPswReset,
          pswResetSuccessfulUpdateSuspended,
        ],
        [
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
          accountNeedsIDResetAdnPswReset,
          passwordResetRequiredUpdate,
        ],
        [AccountStateEventEnum.IPV_IDENTITY_ISSUED, accountNeedsIDResetAdnPswReset, idResetSuccessfulUpdateSuspended],
        [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, accountNeedsIDResetAdnPswReset, unsuspendAccountUpdate],
        [AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accountNeedsIDResetAdnPswReset, suspendAccountUpdate],
      ])('%p', (intervention, retrievedAccountState, command) => {
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from blocked', () => {
      it.each([[AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, accountIsBlocked, unblockAccountUpdate]])(
        '%p',
        (intervention, retrievedAccountState, command) => {
          const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
          expect(partialCommand).toEqual(command);
        },
      );
    });
  });

  describe('Unsuccessful state transitions', () => {
    const duplicateInterventionErrorMessage = 'proposed transition is the same as current account state';

    describe('received intervention is the same as current account state', () => {
      it.each([
        [AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accountIsSuspended],
        [AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, accountIsBlocked],
        [AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET, accountNeedsPswReset],
        [AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, accountNeedsIDReset],
        [
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountNeedsIDResetAdnPswReset,
        ],
      ])('%p', (intervention, retrievedAccountState) => {
        expect(() => AccountStateEvents.applyEventTransition(intervention, retrievedAccountState)).toThrow(
          new StateTransitionErrorIgnored(duplicateInterventionErrorMessage),
        );
      });
    });

    describe('received intervention is not allowed on current account state', () => {
      it.each([
        [AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, undefined],
        [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, undefined],
        [AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, undefined],
        [AccountStateEventEnum.IPV_IDENTITY_ISSUED, undefined],

        [AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, accountIsOkay],
        [AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accountIsOkay],
        [AccountStateEventEnum.IPV_IDENTITY_ISSUED, accountIsOkay],

        [AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, accountIsSuspended],
        [AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accountIsSuspended],
        [AccountStateEventEnum.IPV_IDENTITY_ISSUED, accountIsSuspended],

        [AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, accountNeedsPswReset],
        [AccountStateEventEnum.IPV_IDENTITY_ISSUED, accountNeedsPswReset],

        [AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, accountNeedsIDReset],
        [AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accountNeedsIDReset],

        [AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, accountNeedsIDResetAdnPswReset],

        [AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accountIsBlocked],
        [AccountStateEventEnum.IPV_IDENTITY_ISSUED, accountIsBlocked],
        [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, accountIsBlocked],
        [AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accountIsBlocked],
        [AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET, accountIsBlocked],
        [AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, accountIsBlocked],
        [AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION, accountIsBlocked],
      ])('%p applied on account state: %p', (intervention, retrievedAccountState) => {
        expect(() => AccountStateEvents.applyEventTransition(intervention, retrievedAccountState)).toThrow();
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
          AccountStateEvents.applyEventTransition(AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, unexpectedAccountState),
        ).toThrow(new StateTransitionErrorIgnored('no intervention could be found in current config for this state'));
        expect(logAndPublishMetric).toHaveBeenLastCalledWith(MetricNames.STATE_NOT_FOUND_IN_CURRENT_CONFIG);
      });
    });
  });

  describe('get intervention enum from code method', () => {
    it('should return the right intervention enum given the corresponding code', () => {
      const result = AccountStateEvents.getInterventionEnumFromCode(2);
      expect(result).toEqual(AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT);
    });
    it('should throw if the no intervention can be found with the given code', () => {
      expect(() => AccountStateEvents.getInterventionEnumFromCode(111)).toThrow(
        new StateTransitionErrorIgnored('no intervention could be found in current config for this code'),
      );
    });
  });
});
