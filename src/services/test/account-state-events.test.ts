import { AccountStateEvents } from '../account-states/account-state-events';
import { AccountStateEventEnum } from '../../data-types/constants';

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

const accountIsNotSuspended = {
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
        ['to account blocked', AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, undefined, blockAccountUpdate],
        [
          'to account suspended - no user actions',
          AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT,
          undefined,
          suspendAccountUpdate,
        ],
        [
          'to account suspended - password reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
          undefined,
          passwordResetRequiredUpdate,
        ],
        [
          'to account suspended - id reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
          undefined,
          idResetRequiredUpdate,
        ],
        [
          'to account suspended - password & id reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          undefined,
          pswAndIdResetRequiredUpdate,
        ],
      ])('%p', (testCase, intervention, retrievedAccountState, command) => {
        console.log(testCase);
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from unsuspended', () => {
      it.each([
        ['to account blocked', AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, accountIsNotSuspended, blockAccountUpdate],
        [
          'to account suspended',
          AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT,
          accountIsNotSuspended,
          suspendAccountUpdate,
        ],
        [
          'to account suspended - password reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
          accountIsNotSuspended,
          passwordResetRequiredUpdate,
        ],
        [
          'to account suspended - id reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
          accountIsNotSuspended,
          idResetRequiredUpdate,
        ],
        [
          'to account suspended - password & id reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountIsNotSuspended,
          pswAndIdResetRequiredUpdate,
        ],
      ])('%p', (testCase, intervention, retrievedAccountState, command) => {
        console.log(testCase);
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from suspended no user action', () => {
      it.each([
        [
          'from suspended to unsuspended',
          AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT,
          accountIsSuspended,
          unsuspendAccountUpdate,
        ],
        [
          'from suspended to suspended - password reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
          accountIsSuspended,
          passwordResetRequiredUpdate,
        ],
        [
          'from suspended to suspended - id reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
          accountIsSuspended,
          idResetRequiredUpdate,
        ],
        [
          'from suspended to suspended - password & id reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountIsSuspended,
          pswAndIdResetRequiredUpdate,
        ],
        [
          'from suspended to blocked',
          AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT,
          accountIsSuspended,
          blockAccountUpdate,
        ],
      ])('%p', (testCase, intervention, retrievedAccountState, command) => {
        console.log(testCase);
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from suspended psw reset required', () => {
      it.each([
        ['to blocked', AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, accountNeedsPswReset, blockAccountUpdate],
        [
          'to unsuspended (fraud)',
          AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT,
          accountNeedsPswReset,
          unsuspendAccountUpdate,
        ],
        ['to suspended', AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accountNeedsPswReset, suspendAccountUpdate],
        [
          'to unsuspended (user action)',
          AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
          accountNeedsPswReset,
          pswResetSuccessfulUpdateUnsuspended,
        ],
        [
          'to suspended id reset ',
          AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
          accountNeedsPswReset,
          idResetRequiredUpdate,
        ],
        [
          'to suspended password & id reset ',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountNeedsPswReset,
          pswAndIdResetRequiredUpdate,
        ],
      ])('%p', (testCase, intervention, retrievedAccountState, command) => {
        console.log(testCase);
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from suspended id reset required', () => {
      it.each([
        [
          'to suspended password & id reset ',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountNeedsIDReset,
          pswAndIdResetRequiredUpdate,
        ],
        [
          'to suspended password reset ',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
          accountNeedsIDReset,
          passwordResetRequiredUpdate,
        ],
        ['to suspended ', AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accountNeedsIDReset, suspendAccountUpdate],
        [
          'to unsuspended (fraud) ',
          AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT,
          accountNeedsIDReset,
          unsuspendAccountUpdate,
        ],
        [
          'to unsuspended (user action) ',
          AccountStateEventEnum.IPV_IDENTITY_ISSUED,
          accountNeedsIDReset,
          idResetSuccessfulUpdateUnsuspended,
        ],
        ['to blocked', AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, accountNeedsIDReset, blockAccountUpdate],
      ])('%p', (testCase, intervention, retrievedAccountState, command) => {
        console.log(testCase);
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from suspended psw & id reset required', () => {
      it.each([
        ['to blocked', AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, accountNeedsIDResetAdnPswReset, blockAccountUpdate],
        [
          'to suspended id reset (fraud)',
          AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
          accountNeedsIDResetAdnPswReset,
          idResetRequiredUpdate,
        ],
        [
          'to suspended id reset (user action)',
          AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
          accountNeedsIDResetAdnPswReset,
          pswResetSuccessfulUpdateSuspended,
        ],
        [
          'to suspended psw reset (fraud)',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
          accountNeedsIDResetAdnPswReset,
          passwordResetRequiredUpdate,
        ],
        [
          'to suspended psw reset (user action)',
          AccountStateEventEnum.IPV_IDENTITY_ISSUED,
          accountNeedsIDResetAdnPswReset,
          idResetSuccessfulUpdateSuspended,
        ],
        [
          'to unsuspended (fraud)',
          AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT,
          accountNeedsIDResetAdnPswReset,
          unsuspendAccountUpdate,
        ],
        [
          'to suspended (fraud)',
          AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT,
          accountNeedsIDResetAdnPswReset,
          suspendAccountUpdate,
        ],
      ])('%p', (testCase, intervention, retrievedAccountState, command) => {
        console.log(testCase);
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        expect(partialCommand).toEqual(command);
      });
    });

    describe('from blocked', () => {
      it.each([['to unblocked', AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, accountIsBlocked]])(
        '%p',
        (testCase, intervention, retrievedAccountState) => {
          console.log(testCase);
          const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
          console.log(partialCommand);
        },
      );
    });
  });

  describe('Unsuccessful state transitions', () => {
    const duplicateInterventionErrorMessage = 'new state is the same as current state';
    describe('received intervention is the same as current account state', () => {
      it.each([
        [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, accountIsNotSuspended],
        [AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accountIsSuspended],
        [AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET, accountNeedsPswReset],
        [AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, accountNeedsIDReset],
        [
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accountNeedsIDResetAdnPswReset,
        ],
      ])('%p', (intervention, retrievedAccountState) => {
        expect(() => AccountStateEvents.applyEventTransition(intervention, retrievedAccountState)).toThrow(
          new Error(duplicateInterventionErrorMessage),
        );
      });
    });

    describe('received intervention is not allowed on current account state', () => {
      it.each([
        [AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, undefined],
        [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, undefined],
        [AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, undefined],
        [AccountStateEventEnum.IPV_IDENTITY_ISSUED, undefined],

        [AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, accountIsNotSuspended],
        [AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accountIsNotSuspended],
        [AccountStateEventEnum.IPV_IDENTITY_ISSUED, accountIsNotSuspended],

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
  });

  describe('get intervention enum from code method', () => {
    it('should return the right intervention enum given the corresponding code', () => {
      const result = AccountStateEvents.getInterventionEnumFromCode(2);
      expect(result).toEqual(AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT);
    });
    it('should throw if the no intervention can be found with the given code', () => {
      expect(() => AccountStateEvents.getInterventionEnumFromCode(111)).toThrow(
        new Error('no intervention could be found in current config for this state'),
      );
    });
  });
});
