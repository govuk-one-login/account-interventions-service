import {
  updateAccountStateCountMetric,
  updateAccountStateCountMetricAfterDeletion,
  publishTimeToResolveMetrics,
} from '../metrics-helper';
import { addMetric } from '../metrics';

jest.mock('@aws-lambda-powertools/logger');
jest.mock('../../commons/metrics');
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
const accountNeedsIdReset = {
  blocked: false,
  suspended: true,
  resetPassword: false,
  reproveIdentity: true,
};
const accountIsOkay = {
  blocked: false,
  suspended: false,
  resetPassword: false,
  reproveIdentity: false,
};

const accountIsBlocked = {
  blocked: true,
  suspended: false,
  resetPassword: false,
  reproveIdentity: false,
};
describe('update-account-state-metrics', () => {
  describe('updateAccountStateMetric', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });
    it('should increment ACCOUNTS_BLOCKED', () => {
      updateAccountStateCountMetric(accountIsOkay, accountIsBlocked);
      expect(addMetric).toHaveBeenCalledWith('ACCOUNTS_BLOCKED', [], 1);
    });
    it('should increment ACCOUNTS_SUSPENDED', () => {
      updateAccountStateCountMetric(accountIsOkay, accountIsSuspended);
      expect(addMetric).toHaveBeenCalledWith('ACCOUNTS_SUSPENDED', [], 1);
    });
    it('should decrement ACCOUNTS_SUSPENDED and increment ACCOUNTS_BLOCKED', () => {
      updateAccountStateCountMetric(accountIsSuspended, accountIsBlocked);
    });
    it('should decrement ACCOUNTS_BLOCKED', () => {
      updateAccountStateCountMetric(accountIsBlocked, accountIsOkay);
      expect(addMetric).toHaveBeenCalledWith('ACCOUNTS_BLOCKED', [], -1);
    });
    it('should decrement ACCOUNTS_SUSPENDED', () => {
      updateAccountStateCountMetric(accountIsSuspended, accountIsOkay);
      expect(addMetric).toHaveBeenCalledWith('ACCOUNTS_SUSPENDED', [], -1);
    });
    it('should not decrement/increment either metric', () => {
      updateAccountStateCountMetric(accountIsSuspended, accountNeedsPswReset);
      expect(addMetric).not.toHaveBeenCalled();
    });
  });

  describe('updateAccountStateCountMetricAfterDeletion', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });
    it('should decrement ACCOUNTS_BLOCKED', () => {
      updateAccountStateCountMetricAfterDeletion(true, false);
      expect(addMetric).toHaveBeenCalledWith('ACCOUNTS_BLOCKED', [], -1);
    });
    it('should decrement ACCOUNTS_SUSPENDED', () => {
      updateAccountStateCountMetricAfterDeletion(false, true);
      expect(addMetric).toHaveBeenCalledWith('ACCOUNTS_SUSPENDED', [], -1);
    });
    it('should not decrement either metric', () => {
      updateAccountStateCountMetricAfterDeletion(false, false);
      expect(addMetric).not.toHaveBeenCalled();
    });
  });

  describe('publishTimeToResolveMetrics', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    describe('should publish TimeToResolve metric', () => {
      it('when an account becomes unsuspended', () => {
        publishTimeToResolveMetrics(accountIsSuspended, accountIsOkay, 1000, 11_000, 'FRAUD_UNSUSPEND_ACCOUNT');
        expect(addMetric).toHaveBeenCalledWith('TIME_TO_RESOLVE', [], 10, { type: 'suspension' });
        expect(addMetric).toHaveBeenCalledTimes(1);
      });

      it('when an account becomes unsuspended because a password has been reset successfully', () => {
        publishTimeToResolveMetrics(
          accountNeedsPswReset,
          accountIsOkay,
          1000,
          11_000,
          'AUTH_PASSWORD_RESET_SUCCESSFUL',
        );
        expect(addMetric).toHaveBeenCalledWith('TIME_TO_RESOLVE', [], 10, { type: 'suspension' });
        expect(addMetric).toHaveBeenCalledWith('TIME_TO_RESOLVE', [], 10, { type: 'resetPassword' });
        expect(addMetric).toHaveBeenCalledTimes(2);
      });

      it('when an account stays suspended even after password has been reset successfully', () => {
        publishTimeToResolveMetrics(
          accountNeedsPswReset,
          accountIsSuspended,
          1000,
          11_000,
          'AUTH_PASSWORD_RESET_SUCCESSFUL',
        );
        expect(addMetric).toHaveBeenCalledWith('TIME_TO_RESOLVE', [], 10, { type: 'resetPassword' });
        expect(addMetric).toHaveBeenCalledTimes(1);
      });

      it('when an account becomes unsuspended because an identity has been reset successfully', () => {
        publishTimeToResolveMetrics(accountNeedsIdReset, accountIsOkay, 1000, 11_000, 'IPV_IDENTITY_ISSUED');
        expect(addMetric).toHaveBeenCalledWith('TIME_TO_RESOLVE', [], 10, { type: 'suspension' });
        expect(addMetric).toHaveBeenCalledWith('TIME_TO_RESOLVE', [], 10, { type: 'reproveIdentity' });
        expect(addMetric).toHaveBeenCalledTimes(2);
      });

      it('when an account stays suspended even after identity has been reset successfully', () => {
        publishTimeToResolveMetrics(accountNeedsIdReset, accountIsSuspended, 1000, 11_000, 'IPV_IDENTITY_ISSUED');
        expect(addMetric).toHaveBeenCalledWith('TIME_TO_RESOLVE', [], 10, { type: 'reproveIdentity' });
        expect(addMetric).toHaveBeenCalledTimes(1);
      });
    });

    describe('should NOT publish a TimeToResolve metric', () => {
      it('when an account stays suspended', () => {
        publishTimeToResolveMetrics(accountIsSuspended, accountIsSuspended, 1000, 11_000, 'FRAUD_SUSPEND_ACCOUNT');
        expect(addMetric).not.toHaveBeenCalled();
      });

      it('for when an account becomes suspended', () => {
        publishTimeToResolveMetrics(accountIsOkay, accountIsSuspended, 1000, 11_000, 'FRAUD_SUSPEND_ACCOUNT');
        expect(addMetric).not.toHaveBeenCalled();
      });
    });
  });
});
