import { AccountStateEvents } from '../account-states/account-state-events';
import { AccountStateEventEnum } from '../../data-types/constants';

const accumulatorSuspendedState = {
  blocked: false,
  suspended: true,
  resetPassword: false,
  reproveIdentity: false,
};

const accumulatorNeedsPswReset = {
  blocked: false,
  suspended: true,
  resetPassword: true,
  reproveIdentity: false,
};

const accumulatorIsNotSuspended = {
  blocked: false,
  suspended: false,
  resetPassword: false,
  reproveIdentity: false,
};

const accumulatorNeedsIDReset = {
  blocked: false,
  suspended: true,
  resetPassword: false,
  reproveIdentity: true,
};

const accumulatorNeedsIDResetAdnPswReset = {
  blocked: false,
  suspended: true,
  resetPassword: true,
  reproveIdentity: true,
};

const accumulatorIsBlocked = {
  blocked: true,
  suspended: false,
  resetPassword: false,
  reproveIdentity: false,
};

describe('account-state-service', () => {
  describe('Successful state transitions', () => {
    describe('from no intervention', () => {
      it.each([
        ['to account blocked', AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, undefined],
        ['to account suspended - no user actions', AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, undefined],
        [
          'to account suspended - password reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
          undefined,
        ],
        [
          'to account suspended - id reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
          undefined,
        ],
        [
          'to account suspended - password & id reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          undefined,
        ],
      ])('%p', (testCase, intervention, retrievedAccountState) => {
        console.log(testCase);
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        console.log(partialCommand);
      });
    });

    describe('from unsuspended', () => {
      it.each([
        ['to account blocked', AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, accumulatorIsNotSuspended],
        ['to account suspended', AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accumulatorIsNotSuspended],
        [
          'to account suspended - password reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
          accumulatorIsNotSuspended,
        ],
        [
          'to account suspended - id reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
          accumulatorIsNotSuspended,
        ],
        [
          'to account suspended - password & id reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accumulatorIsNotSuspended,
        ],
      ])('%p', (testCase, intervention, retrievedAccountState) => {
        console.log(testCase);
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        console.log(partialCommand);
      });
    });

    describe('from suspended no user action', () => {
      it.each([
        ['from suspended to unsuspended', AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, accumulatorSuspendedState],
        [
          'from suspended to suspended - password reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
          accumulatorSuspendedState,
        ],
        [
          'from suspended to suspended - id reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
          accumulatorSuspendedState,
        ],
        [
          'from suspended to suspended - password & id reset required',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accumulatorSuspendedState,
        ],
        [
          'from suspended to blocked',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accumulatorSuspendedState,
        ],
      ])('%p', (testCase, intervention, retrievedAccountState) => {
        console.log(testCase);
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        console.log(partialCommand);
      });
    });

    describe('from suspended psw reset required', () => {
      it.each([
        ['to blocked', AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, accumulatorNeedsPswReset],
        ['to unsuspended (fraud)', AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, accumulatorNeedsPswReset],
        ['to suspended', AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accumulatorNeedsPswReset],
        [
          'to unsuspended (user action)',
          AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
          accumulatorNeedsPswReset,
        ],
        [
          'to suspended id reset ',
          AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
          accumulatorNeedsPswReset,
        ],
        [
          'to suspended password & id reset ',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accumulatorNeedsPswReset,
        ],
      ])('%p', (testCase, intervention, retrievedAccountState) => {
        console.log(testCase);
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        console.log(partialCommand);
      });
    });

    describe('from suspended id reset required', () => {
      it.each([
        [
          'to suspended password & id reset ',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accumulatorNeedsIDReset,
        ],
        [
          'to suspended password reset ',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
          accumulatorNeedsIDReset,
        ],
        ['to suspended ', AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accumulatorNeedsIDReset],
        ['to unsuspended (fraud) ', AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, accumulatorNeedsIDReset],
        ['to unsuspended (user action) ', AccountStateEventEnum.IPV_IDENTITY_ISSUED, accumulatorNeedsIDReset],
        ['to blocked', AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, accumulatorNeedsIDReset],
      ])('%p', (testCase, intervention, retrievedAccountState) => {
        console.log(testCase);
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        console.log(partialCommand);
      });
    });

    describe('from suspended psw & id reset required', () => {
      it.each([
        ['to blocked', AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT, accumulatorNeedsIDResetAdnPswReset],
        [
          'to suspended id reset (fraud)',
          AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
          accumulatorNeedsIDResetAdnPswReset,
        ],
        [
          'to suspended id reset (user action)',
          AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
          accumulatorNeedsIDResetAdnPswReset,
        ],
        [
          'to suspended psw reset (fraud)',
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
          accumulatorNeedsIDResetAdnPswReset,
        ],
        [
          'to suspended psw reset (user action)',
          AccountStateEventEnum.IPV_IDENTITY_ISSUED,
          accumulatorNeedsIDResetAdnPswReset,
        ],
        ['to unsuspended (fraud)', AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, accumulatorNeedsIDResetAdnPswReset],
        ['to suspended (fraud)', AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accumulatorNeedsIDResetAdnPswReset],
      ])('%p', (testCase, intervention, retrievedAccountState) => {
        console.log(testCase);
        const partialCommand = AccountStateEvents.applyEventTransition(intervention, retrievedAccountState);
        console.log(partialCommand);
      });
    });

    describe('from blocked', () => {
      it.each([['to unblocked', AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, accumulatorIsBlocked]])(
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
        [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, accumulatorIsNotSuspended],
        [AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accumulatorSuspendedState],
        [AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET, accumulatorNeedsPswReset],
        [AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, accumulatorNeedsIDReset],
        [
          AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION,
          accumulatorNeedsIDResetAdnPswReset,
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

        [AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, accumulatorIsNotSuspended],
        [AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accumulatorIsNotSuspended],
        [AccountStateEventEnum.IPV_IDENTITY_ISSUED, accumulatorIsNotSuspended],

        [AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, accumulatorSuspendedState],
        [AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accumulatorSuspendedState],
        [AccountStateEventEnum.IPV_IDENTITY_ISSUED, accumulatorSuspendedState],

        [AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, accumulatorNeedsPswReset],
        [AccountStateEventEnum.IPV_IDENTITY_ISSUED, accumulatorNeedsPswReset],

        [AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, accumulatorNeedsIDReset],
        [AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accumulatorNeedsIDReset],

        [AccountStateEventEnum.FRAUD_UNBLOCK_ACCOUNT, accumulatorNeedsIDResetAdnPswReset],

        [AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL, accumulatorIsBlocked],
        [AccountStateEventEnum.IPV_IDENTITY_ISSUED, accumulatorIsBlocked],
        [AccountStateEventEnum.FRAUD_UNSUSPEND_ACCOUNT, accumulatorIsBlocked],
        [AccountStateEventEnum.FRAUD_SUSPEND_ACCOUNT, accumulatorIsBlocked],
        [AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET, accumulatorIsBlocked],
        [AccountStateEventEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION, accumulatorIsBlocked],
        [AccountStateEventEnum.FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION, accumulatorIsBlocked],
      ])('%p applied on account state: %p', (intervention, retrievedAccountState) => {
        expect(() => AccountStateEvents.applyEventTransition(intervention, retrievedAccountState)).toThrow();
      });
    });
  });
});
