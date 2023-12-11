import {
  updateAccountStateCountMetric,
  updateAccountStateCountMetricAfterDeletion,
} from '../update-account-state-metrics';
import { logAndPublishMetric } from '../metrics';

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
      expect(logAndPublishMetric).toHaveBeenCalledWith('ACCOUNTS_BLOCKED', [], 1);
    });
    it('should increment ACCOUNTS_SUSPENDED', () => {
      updateAccountStateCountMetric(accountIsOkay, accountIsSuspended);
      expect(logAndPublishMetric).toHaveBeenCalledWith('ACCOUNTS_SUSPENDED', [], 1);
    });
    it('should decrement ACCOUNTS_SUSPENDED and increment ACCOUNTS_BLOCKED', () => {
      updateAccountStateCountMetric(accountIsSuspended, accountIsBlocked);
    });
    it('should decrement ACCOUNTS_BLOCKED', () => {
      updateAccountStateCountMetric(accountIsBlocked, accountIsOkay);
      expect(logAndPublishMetric).toHaveBeenCalledWith('ACCOUNTS_BLOCKED', [], -1);
    });
    it('should decrement ACCOUNTS_SUSPENDED', () => {
      updateAccountStateCountMetric(accountIsSuspended, accountIsOkay);
      expect(logAndPublishMetric).toHaveBeenCalledWith('ACCOUNTS_SUSPENDED', [], -1);
    });
    it('should not decrement/increment either metric', () => {
      updateAccountStateCountMetric(accountIsSuspended, accountNeedsPswReset);
      expect(logAndPublishMetric).not.toHaveBeenCalled();
    });
  });

  describe('updateAccountStateCountMetricAfterDeletion', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });
    it('should decrement ACCOUNTS_BLOCKED', () => {
      updateAccountStateCountMetricAfterDeletion(true, false);
      expect(logAndPublishMetric).toHaveBeenCalledWith('ACCOUNTS_BLOCKED', [], -1);
    });
    it('should decrement ACCOUNTS_SUSPENDED', () => {
      updateAccountStateCountMetricAfterDeletion(false, true);
      expect(logAndPublishMetric).toHaveBeenCalledWith('ACCOUNTS_SUSPENDED', [], -1);
    });
    it('should not decrement either metric', () => {
      updateAccountStateCountMetricAfterDeletion(false, false);
      expect(logAndPublishMetric).not.toHaveBeenCalled();
    });
  });
});
