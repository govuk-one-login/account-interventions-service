import { StateDetails } from '../../data-types/interfaces';
import { AISInterventionTypes, EventsEnum, MetricNames } from '../../data-types/constants';
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
describe('build-partial-update-state-command', () => {
  it('should return a partial update update command given Auth successful password reset is applied is applied', () => {
    const state: StateDetails = {
      blocked: false,
      suspended: false,
      resetPassword: true,
      reproveIdentity: true,
    };
    const userAction = EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL;
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
        ':rpswda': { N: '1111' },
      },
      UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #RPswdA = :rpswda',
    };
    const command = buildPartialUpdateAccountStateCommand(state, userAction, 1111, 2222);
    expect(command).toEqual(expectedOutput);
  });
  it('should return a partial update update command given IPV successful id reset is applied is applied', () => {
    const state: StateDetails = {
      blocked: false,
      suspended: false,
      resetPassword: true,
      reproveIdentity: true,
    };
    const userAction = EventsEnum.IPV_IDENTITY_ISSUED;
    const expectedOutput = {
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
        ':rp': { BOOL: true },
        ':ri': { BOOL: true },
        ':ua': { N: '1234567890' },
        ':rida': { N: '1111' },
      },
      UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #RIdA = :rida',
    };
    const command = buildPartialUpdateAccountStateCommand(state, userAction, 1111, 2222);
    expect(command).toEqual(expectedOutput);
  });

  it('should return a partial update update command given an intervention is applied', () => {
    const state: StateDetails = {
      blocked: false,
      suspended: true,
      resetPassword: true,
      reproveIdentity: false,
    };
    const intervention = EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET;
    const expectedOutput = {
      ExpressionAttributeNames: {
        '#B': 'blocked',
        '#S': 'suspended',
        '#RP': 'resetPassword',
        '#RI': 'reproveIdentity',
        '#UA': 'updatedAt',
        '#SA': 'sentAt',
        '#AA': 'appliedAt',
        '#H': 'history',
        '#INT': 'intervention',
      },
      ExpressionAttributeValues: {
        ':b': { BOOL: false },
        ':s': { BOOL: true },
        ':rp': { BOOL: true },
        ':ri': { BOOL: false },
        ':ua': { N: '1234567890' },
        ':sa': { N: '1111' },
        ':aa': { N: '2222' },
        ':empty_list': { L: [] },
        ':h': { L: [{ M: { intervention: { S: 'AIS_FORCED_USER_PASSWORD_RESET' }, timestamp: { N: '1111' } } }] },
        ':int': { S: 'AIS_FORCED_USER_PASSWORD_RESET' },
      },
      UpdateExpression:
        'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #SA = :sa, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
    };
    const command = buildPartialUpdateAccountStateCommand(
      state,
      intervention,
      1111,
      2222,
      AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET,
    );
    expect(command).toEqual(expectedOutput);
  });

  it('should throw an error if an intervention is passed without an intervention name', () => {
    const state: StateDetails = {
      blocked: false,
      suspended: false,
      resetPassword: true,
      reproveIdentity: true,
    };
    const intervention = EventsEnum.FRAUD_BLOCK_ACCOUNT;
    expect(() => buildPartialUpdateAccountStateCommand(state, intervention, 1234, 2222)).toThrow(
      new Error('The intervention received did not have an interventionName field.'),
    );
    expect(logAndPublishMetric).toHaveBeenLastCalledWith(MetricNames.INTERVENTION_DID_NOT_HAVE_NAME_IN_CURRENT_CONFIG);
  });
});
