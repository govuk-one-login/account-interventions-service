import { StateDetails } from '../../data-types/interfaces';
import { AccountStateEventEnum, MetricNames } from '../../data-types/constants';
import { buildPartialUpdateAccountStateCommand } from '../build-partial-update-state-command';
import { logAndPublishMetric } from '../metrics';

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
describe('build-partial-upadte-state-command', () => {
  it('should return a partial update update command', () => {
    const state: StateDetails = {
      blocked: false,
      suspended: false,
      resetPassword: true,
      reproveIdentity: true,
    };
    const userAction = AccountStateEventEnum.AUTH_PASSWORD_RESET_SUCCESSFUL;
    const expectedOutput = {
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
        ':rp': { BOOL: true },
        ':ri': { BOOL: true },
        ':ua': { N: '1234567890' },
        ':rpswda': { N: '1234567890' },
      },
      UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #RPswdA = :rpswda',
    };
    const command = buildPartialUpdateAccountStateCommand(state, userAction);
    expect(command).toEqual(expectedOutput);
  });
  it('should throw an error if an intervention is passed without an intervention name', () => {
    const state: StateDetails = {
      blocked: false,
      suspended: false,
      resetPassword: true,
      reproveIdentity: true,
    };
    const intervention = AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT;
    expect(() => buildPartialUpdateAccountStateCommand(state, intervention)).toThrow(
      new Error('intervention received did not have an interventionName field'),
    );
    expect(logAndPublishMetric).toHaveBeenLastCalledWith(MetricNames.INTERVENTION_DID_NOT_HAVE_NAME_IN_CURRENT_CONFIG);
  });
});
