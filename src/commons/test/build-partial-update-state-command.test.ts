import { StateDetails } from '../../data-types/interfaces';
import { AISInterventionTypes, EventsEnum, MetricNames, TriggerEventsEnum } from '../../data-types/constants';
import { buildPartialUpdateAccountStateCommand } from '../build-partial-update-state-command';
import { addMetric } from '../metrics';
import {
  AuthPasswordResetSuccessful,
  IpvAccountInterventionEnd,
  TicfAccountIntervention,
} from '../../contracts/intervention-events';

vi.mock('@aws-lambda-powertools/logger');
vi.mock('../../commons/metrics');

const interventionEventBody: TicfAccountIntervention = {
  timestamp: 1000,
  event_timestamp_ms: 123456,
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

const resetPasswordEventBody: AuthPasswordResetSuccessful = {
  event_name: EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
  event_id: '123',
  timestamp: 10000,
  event_timestamp_ms: 10000000,
  component_id: 'UNKNOWN',
  user: {
    user_id: 'abc',
  },
};

const ipvAccountInterventionEventBody: IpvAccountInterventionEnd = {
  event_name: EventsEnum.IPV_ACCOUNT_INTERVENTION_END,
  event_id: '123',
  timestamp: 10000,
  event_timestamp_ms: 10000000,
  component_id: 'UNKNOWN',
  user: {
    user_id: 'abc',
  },
  extensions: {},
};

describe('build-partial-update-state-command', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1706544555234);
  });

  afterAll(() => {
    vi.useRealTimers();
  });
  it('should return a partial update command given Auth successful password reset is applied', () => {
    const state: StateDetails = {
      blocked: false,
      suspended: false,
      resetPassword: true,
      reproveIdentity: true,
    };

    const command = buildPartialUpdateAccountStateCommand(state, 4444, resetPasswordEventBody, []);

    expect(command).toEqual({
      input: {
        blocked: false,
        history: [],
        suspended: false,
        resetPassword: true,
        reproveIdentity: true,
        updatedAt: 4444,
        resetPasswordAt: 10000000,
      },
    });
  });

  it('should return a partial update command given IPV successful id reset is applied', () => {
    const state: StateDetails = {
      blocked: false,
      suspended: false,
      resetPassword: true,
      reproveIdentity: true,
    };

    const command = buildPartialUpdateAccountStateCommand(state, 4444, ipvAccountInterventionEventBody, []);

    expect(command).toEqual({
      input: {
        blocked: false,
        history: [],
        suspended: false,
        resetPassword: true,
        reproveIdentity: true,
        updatedAt: 4444,
        reprovedIdentityAt: 10000000,
      },
    });
  });

  it('should return a partial update command given an intervention is applied', () => {
    const state: StateDetails = {
      blocked: false,
      suspended: true,
      resetPassword: true,
      reproveIdentity: false,
    };

    const command = buildPartialUpdateAccountStateCommand(
      state,
      4444,
      interventionEventBody,
      [],
      AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET,
    );

    expect(command).toEqual({
      input: {
        blocked: false,
        suspended: true,
        resetPassword: true,
        reproveIdentity: false,
        updatedAt: 4444,
        sentAt: 123456,
        appliedAt: 4444,
        history: ['123456|TICF_CRI|01|reason|originating_component_id|originator_reference_id|requester_id'],
        intervention: 'AIS_FORCED_USER_PASSWORD_RESET',
      },
      keysToRemove: ['resetPasswordAt'],
    });
  });
  it('should return a partial update command given an unsuspend intervention is applied', () => {
    const state: StateDetails = {
      blocked: false,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
    };

    const command = buildPartialUpdateAccountStateCommand(
      state,
      4444,
      interventionEventBody,
      [],
      AISInterventionTypes.AIS_ACCOUNT_UNSUSPENDED,
    );

    expect(command).toEqual({
      input: {
        blocked: false,
        suspended: false,
        resetPassword: false,
        reproveIdentity: false,
        updatedAt: 4444,
        sentAt: 123456,
        appliedAt: 4444,
        history: ['123456|TICF_CRI|01|reason|originating_component_id|originator_reference_id|requester_id'],
        intervention: 'AIS_ACCOUNT_UNSUSPENDED',
      },
      keysToRemove: [],
    });
  });

  it('should return a partial update command given an intervention is applied and id reset user action is needed', () => {
    const state: StateDetails = {
      blocked: false,
      suspended: true,
      resetPassword: false,
      reproveIdentity: true,
    };

    const command = buildPartialUpdateAccountStateCommand(
      state,
      4444,
      interventionEventBody,
      [],
      AISInterventionTypes.AIS_FORCED_USER_IDENTITY_VERIFY,
    );

    expect(command).toEqual({
      input: {
        blocked: false,
        suspended: true,
        resetPassword: false,
        reproveIdentity: true,
        updatedAt: 4444,
        sentAt: 123456,
        appliedAt: 4444,
        history: ['123456|TICF_CRI|01|reason|originating_component_id|originator_reference_id|requester_id'],
        intervention: 'AIS_FORCED_USER_IDENTITY_VERIFY',
      },
      keysToRemove: ['reprovedIdentityAt'],
    });
  });

  it('should return a partial update command given an intervention is applied and id reset and psw reset user actions are needed', () => {
    const state: StateDetails = {
      blocked: false,
      suspended: true,
      resetPassword: true,
      reproveIdentity: true,
    };

    const command = buildPartialUpdateAccountStateCommand(
      state,
      4444,
      interventionEventBody,
      ['1706544554234|TICF_CRI|02|reason|originating_component_id|originator_reference_id|requester_id'],
      AISInterventionTypes.AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY,
    );

    expect(command).toEqual({
      input: {
        blocked: false,
        suspended: true,
        resetPassword: true,
        reproveIdentity: true,
        updatedAt: 4444,
        sentAt: 123456,
        appliedAt: 4444,
        history: [
          '1706544554234|TICF_CRI|02|reason|originating_component_id|originator_reference_id|requester_id',
          '123456|TICF_CRI|01|reason|originating_component_id|originator_reference_id|requester_id',
        ],
        intervention: 'AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY',
      },
      keysToRemove: ['resetPasswordAt', 'reprovedIdentityAt'],
    });
  });

  it('should throw an error if an intervention is passed without an intervention name', () => {
    const state: StateDetails = {
      blocked: false,
      suspended: false,
      resetPassword: true,
      reproveIdentity: true,
    };
    expect(() => buildPartialUpdateAccountStateCommand(state, 4444, interventionEventBody, [])).toThrow(
      new Error('The intervention received did not have an interventionName field.'),
    );
    expect(addMetric).toHaveBeenLastCalledWith(MetricNames.INTERVENTION_DID_NOT_HAVE_NAME_IN_CURRENT_CONFIG);
  });
});
