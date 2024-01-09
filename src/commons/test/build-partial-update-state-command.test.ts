import { StateDetails, TxMAIngressEvent } from '../../data-types/interfaces';
import { AISInterventionTypes, EventsEnum, MetricNames, TriggerEventsEnum } from '../../data-types/constants';
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
const interventionEventBody: TxMAIngressEvent = {
  timestamp: 1000,
  event_timestamp_ms: 123_456,
  user: {
    user_id: 'abc',
  },
  component_id: 'TICF_CRI',
  event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
  event_id: '123',
  extensions: {
    intervention: {
      intervention_code: '01',
      intervention_reason: 'reason',
      requester_id: 'requester_id',
      originating_component_id: 'originating_component_id',
      originator_reference_id: 'originator_reference_id',
    },
  },
};
const resetPasswordEventBody = {
  event_name: TriggerEventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
  event_id: '123',
  timestamp: 10_000,
  event_timestamp_ms: 10_000_000,
  client_id: 'UNKNOWN',
  component_id: 'UNKNOWN',
  user: {
    user_id: 'abc',
    email: '',
    phone: 'UNKNOWN',
    ip_address: '',
    session_id: '',
    persistent_session_id: '',
    govuk_signin_journey_id: '',
  },
};

describe('build-partial-update-state-command', () => {
  it('should return a partial update command given Auth successful password reset is applied', () => {
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
        ':ua': { N: '2222' },
        ':rpswda': { N: '10000000' },
      },
      UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #RPswdA = :rpswda',
    };
    const command = buildPartialUpdateAccountStateCommand(state, userAction, 2222, resetPasswordEventBody);
    expect(command).toEqual(expectedOutput);
  });
  it('should return a partial update command given IPV successful id reset is applied', () => {
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
        ':ua': { N: '2222' },
        ':rida': { N: '10000000' },
      },
      UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #RIdA = :rida',
    };
    const command = buildPartialUpdateAccountStateCommand(state, userAction, 2222, resetPasswordEventBody);
    expect(command).toEqual(expectedOutput);
  });

  it('should return a partial update command given an intervention is applied', () => {
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
        ':ua': { N: '2222' },
        ':sa': { N: '123456' },
        ':aa': { N: '2222' },
        ':empty_list': { L: [] },
        ':h': { L: [{ S: '123456|TICF_CRI|01|reason|originating_component_id|originator_reference_id|requester_id' }] },
        ':int': { S: 'AIS_FORCED_USER_PASSWORD_RESET' },
      },
      UpdateExpression:
        'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #SA = :sa, #AA = :aa, #H = list_append(if_not_exists(#H, :empty_list), :h)',
    };
    const command = buildPartialUpdateAccountStateCommand(
      state,
      intervention,
      2222,
      interventionEventBody,
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
    expect(() => buildPartialUpdateAccountStateCommand(state, intervention, 2222, interventionEventBody)).toThrow(
      new Error('The intervention received did not have an interventionName field.'),
    );
    expect(logAndPublishMetric).toHaveBeenLastCalledWith(MetricNames.INTERVENTION_DID_NOT_HAVE_NAME_IN_CURRENT_CONFIG);
  });
});
