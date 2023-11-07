import {StateDetails} from '../../data-types/interfaces';
import {AISInterventionTypes, EventsEnum, MetricNames} from '../../data-types/constants';
import {buildPartialUpdateAccountStateCommand} from '../build-partial-update-state-command';
import {logAndPublishMetric} from '../metrics';

// const blockAccountUpdate = {
//   ExpressionAttributeNames: {
//     '#B': 'blocked',
//     '#S': 'suspended',
//     '#RP': 'resetPassword',
//     '#RI': 'reproveIdentity',
//     '#UA': 'updatedAt',
//     '#INT': 'intervention',
//     '#AA': 'appliedAt',
//     '#H': 'history',
//   },
//   ExpressionAttributeValues: {
//     ':b': { BOOL: true },
//     ':s': { BOOL: false },
//     ':rp': { BOOL: false },
//     ':ri': { BOOL: false },
//     ':ua': { N: '1234567890' },
//     ':int': { S: 'AIS_ACCOUNT_BLOCKED' },
//     ':aa': { N: '1234567890' },
//     ':empty_list': { L: [] },
//     ':h': { L: [{ S: 'AIS_ACCOUNT_BLOCKED' }] },
//   },
//   UpdateExpression:
//     'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
// };
//
// const unblockAccountUpdate = {
//   ExpressionAttributeNames: {
//     '#B': 'blocked',
//     '#S': 'suspended',
//     '#RP': 'resetPassword',
//     '#RI': 'reproveIdentity',
//     '#UA': 'updatedAt',
//     '#INT': 'intervention',
//     '#AA': 'appliedAt',
//     '#H': 'history',
//   },
//   ExpressionAttributeValues: {
//     ':b': { BOOL: false },
//     ':s': { BOOL: false },
//     ':rp': { BOOL: false },
//     ':ri': { BOOL: false },
//     ':ua': { N: '1234567890' },
//     ':int': { S: 'AIS_ACCOUNT_UNBLOCKED' },
//     ':aa': { N: '1234567890' },
//     ':empty_list': { L: [] },
//     ':h': { L: [{ S: 'AIS_ACCOUNT_UNBLOCKED' }] },
//   },
//   UpdateExpression:
//     'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
// };
//
// const suspendAccountUpdate = {
//   ExpressionAttributeNames: {
//     '#B': 'blocked',
//     '#S': 'suspended',
//     '#RP': 'resetPassword',
//     '#RI': 'reproveIdentity',
//     '#UA': 'updatedAt',
//     '#INT': 'intervention',
//     '#AA': 'appliedAt',
//     '#H': 'history',
//   },
//   ExpressionAttributeValues: {
//     ':b': { BOOL: false },
//     ':s': { BOOL: true },
//     ':rp': { BOOL: false },
//     ':ri': { BOOL: false },
//     ':ua': { N: '1234567890' },
//     ':int': { S: 'AIS_ACCOUNT_SUSPENDED' },
//     ':aa': { N: '1234567890' },
//     ':empty_list': { L: [] },
//     ':h': { L: [{ S: 'AIS_ACCOUNT_SUSPENDED' }] },
//   },
//   UpdateExpression:
//     'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
// };
//
// const unsuspendAccountUpdate = {
//   ExpressionAttributeNames: {
//     '#B': 'blocked',
//     '#S': 'suspended',
//     '#RP': 'resetPassword',
//     '#RI': 'reproveIdentity',
//     '#UA': 'updatedAt',
//     '#INT': 'intervention',
//     '#AA': 'appliedAt',
//     '#H': 'history',
//   },
//   ExpressionAttributeValues: {
//     ':b': { BOOL: false },
//     ':s': { BOOL: false },
//     ':rp': { BOOL: false },
//     ':ri': { BOOL: false },
//     ':ua': { N: '1234567890' },
//     ':int': { S: 'AIS_ACCOUNT_UNSUSPENDED' },
//     ':aa': { N: '1234567890' },
//     ':empty_list': { L: [] },
//     ':h': { L: [{ S: 'AIS_ACCOUNT_UNSUSPENDED' }] },
//   },
//   UpdateExpression:
//     'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
// };
//
// const passwordResetRequiredUpdate = {
//   ExpressionAttributeNames: {
//     '#B': 'blocked',
//     '#S': 'suspended',
//     '#RP': 'resetPassword',
//     '#RI': 'reproveIdentity',
//     '#UA': 'updatedAt',
//     '#INT': 'intervention',
//     '#AA': 'appliedAt',
//     '#H': 'history',
//   },
//   ExpressionAttributeValues: {
//     ':b': { BOOL: false },
//     ':s': { BOOL: true },
//     ':rp': { BOOL: true },
//     ':ri': { BOOL: false },
//     ':ua': { N: '1234567890' },
//     ':int': { S: 'AIS_FORCED_USER_PASSWORD_RESET' },
//     ':aa': { N: '1234567890' },
//     ':empty_list': { L: [] },
//     ':h': { L: [{ S: 'AIS_FORCED_USER_PASSWORD_RESET' }] },
//   },
//   UpdateExpression:
//     'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
// };
//
// const idResetRequiredUpdate = {
//   ExpressionAttributeNames: {
//     '#B': 'blocked',
//     '#S': 'suspended',
//     '#RP': 'resetPassword',
//     '#RI': 'reproveIdentity',
//     '#UA': 'updatedAt',
//     '#INT': 'intervention',
//     '#AA': 'appliedAt',
//     '#H': 'history',
//   },
//   ExpressionAttributeValues: {
//     ':b': { BOOL: false },
//     ':s': { BOOL: true },
//     ':rp': { BOOL: false },
//     ':ri': { BOOL: true },
//     ':ua': { N: '1234567890' },
//     ':int': { S: 'AIS_FORCED_USER_IDENTITY_VERIFY' },
//     ':aa': { N: '1234567890' },
//     ':empty_list': { L: [] },
//     ':h': { L: [{ S: 'AIS_FORCED_USER_IDENTITY_VERIFY' }] },
//   },
//   UpdateExpression:
//     'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
// };
//
// const pswAndIdResetRequiredUpdate = {
//   ExpressionAttributeNames: {
//     '#B': 'blocked',
//     '#S': 'suspended',
//     '#RP': 'resetPassword',
//     '#RI': 'reproveIdentity',
//     '#UA': 'updatedAt',
//     '#INT': 'intervention',
//     '#AA': 'appliedAt',
//     '#H': 'history',
//   },
//   ExpressionAttributeValues: {
//     ':b': { BOOL: false },
//     ':s': { BOOL: true },
//     ':rp': { BOOL: true },
//     ':ri': { BOOL: true },
//     ':ua': { N: '1234567890' },
//     ':int': { S: 'AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY' },
//     ':aa': { N: '1234567890' },
//     ':empty_list': { L: [] },
//     ':h': { L: [{ S: 'AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY' }] },
//   },
//   UpdateExpression:
//     'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
// };
//
// const pswResetSuccessfulUpdateUnsuspended = {
//   ExpressionAttributeNames: {
//     '#B': 'blocked',
//     '#S': 'suspended',
//     '#RP': 'resetPassword',
//     '#RI': 'reproveIdentity',
//     '#UA': 'updatedAt',
//     '#RPswdA': 'resetPasswordAt',
//   },
//   ExpressionAttributeValues: {
//     ':b': { BOOL: false },
//     ':s': { BOOL: false },
//     ':rp': { BOOL: false },
//     ':ri': { BOOL: false },
//     ':ua': { N: '1234567890' },
//     ':rpswda': { N: '1234567890' },
//   },
//   UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #RPswdA = :rpswda',
// };
//
// const pswResetSuccessfulUpdateSuspended = {
//   ExpressionAttributeNames: {
//     '#B': 'blocked',
//     '#S': 'suspended',
//     '#RP': 'resetPassword',
//     '#RI': 'reproveIdentity',
//     '#UA': 'updatedAt',
//     '#RPswdA': 'resetPasswordAt',
//   },
//   ExpressionAttributeValues: {
//     ':b': { BOOL: false },
//     ':s': { BOOL: true },
//     ':rp': { BOOL: false },
//     ':ri': { BOOL: true },
//     ':ua': { N: '1234567890' },
//     ':rpswda': { N: '1234567890' },
//   },
//   UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #RPswdA = :rpswda',
// };
//
// const idResetSuccessfulUpdateUnsuspended = {
//   ExpressionAttributeNames: {
//     '#B': 'blocked',
//     '#S': 'suspended',
//     '#RP': 'resetPassword',
//     '#RI': 'reproveIdentity',
//     '#UA': 'updatedAt',
//     '#RIdA': 'reprovedIdentityAt',
//   },
//   ExpressionAttributeValues: {
//     ':b': { BOOL: false },
//     ':s': { BOOL: false },
//     ':rp': { BOOL: false },
//     ':ri': { BOOL: false },
//     ':ua': { N: '1234567890' },
//     ':rida': { N: '1234567890' },
//   },
//   UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #RIdA = :rida',
// };
//
// const idResetSuccessfulUpdateSuspended = {
//   ExpressionAttributeNames: {
//     '#B': 'blocked',
//     '#S': 'suspended',
//     '#RP': 'resetPassword',
//     '#RI': 'reproveIdentity',
//     '#UA': 'updatedAt',
//     '#RIdA': 'reprovedIdentityAt',
//   },
//   ExpressionAttributeValues: {
//     ':b': { BOOL: false },
//     ':s': { BOOL: true },
//     ':rp': { BOOL: true },
//     ':ri': { BOOL: false },
//     ':ua': { N: '1234567890' },
//     ':rida': { N: '1234567890' },
//   },
//   UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #RIdA = :rida',
// };


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
  it('should return a partial update update command given a user action is applied', () => {
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
    const command = buildPartialUpdateAccountStateCommand(state, userAction, 1111);
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
        "#AA": "appliedAt",
        "#H": "history",
        "#INT": "intervention",
      },
      ExpressionAttributeValues: {
        ':b': { BOOL: false },
        ':s': { BOOL: true },
        ':rp': { BOOL: true },
        ':ri': { BOOL: false },
        ':ua': { N: '1234567890' },
        ':sa': { N: '1111' },
        ':aa' : { N: '1234567890'},
        ':empty_list' : { L : [] },
        ':h' : { L : [{ S: 'AIS_FORCED_USER_PASSWORD_RESET' }]},
        ':int' : { S : 'AIS_FORCED_USER_PASSWORD_RESET' }
      },
      UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #SA = :sa, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
    };
    const command = buildPartialUpdateAccountStateCommand(state, intervention, 1111, AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET);
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
    expect(() => buildPartialUpdateAccountStateCommand(state, intervention, 1234)).toThrow(
      new Error('The intervention received did not have an interventionName field.'),
    );
    expect(logAndPublishMetric).toHaveBeenLastCalledWith(MetricNames.INTERVENTION_DID_NOT_HAVE_NAME_IN_CURRENT_CONFIG);
  });
});
