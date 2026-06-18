import { InterventionName, InterventionState } from '../../data-types/constants';
import { filterEventStreamToActive, previousStateToInterventions } from '../active-interventions-service';

describe('previousStateToInterventions', () => {
  test('no previous state', () => {
    expect(previousStateToInterventions()).toEqual([]);
  });

  test('previous state no interventions', () => {
    expect(
      previousStateToInterventions({
        blocked: false,
        suspended: false,
        resetPassword: false,
        reproveIdentity: false,
      }),
    ).toEqual([]);
  });

  test('reset password', () => {
    expect(
      previousStateToInterventions({
        blocked: false,
        suspended: true,
        resetPassword: true,
        reproveIdentity: false,
      }),
    ).toEqual(['RESET_PASSWORD']);
  });

  test('reprove identity', () => {
    expect(
      previousStateToInterventions({
        blocked: false,
        suspended: true,
        resetPassword: false,
        reproveIdentity: true,
      }),
    ).toEqual(['REPROVE_IDENTITY']);
  });

  test('reset password and reprove identity', () => {
    expect(
      previousStateToInterventions({
        blocked: false,
        suspended: true,
        resetPassword: true,
        reproveIdentity: true,
      }),
    ).toEqual(['RESET_PASSWORD', 'REPROVE_IDENTITY']);
  });

  test('blocked', () => {
    expect(
      previousStateToInterventions({
        blocked: true,
        suspended: false,
        resetPassword: false,
        reproveIdentity: false,
      }),
    ).toEqual(['PERMANENT_SUSPENSION']);
  });

  test('suspended', () => {
    expect(
      previousStateToInterventions({
        blocked: false,
        suspended: true,
        resetPassword: false,
        reproveIdentity: false,
      }),
    ).toEqual(['TEMPORARY_SUSPENSION']);
  });
});

describe('filterEventStreamToActive', () => {
  test('single active intervention event', () => {
    expect(
      filterEventStreamToActive([
        {
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.ACTIVE,
        },
      ]),
    ).toEqual(new Set([InterventionName.TEMPORARY_SUSPENSION]));
  });

  test('single removed intervention event', () => {
    expect(
      filterEventStreamToActive([
        {
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.REMOVED,
        },
      ]),
    ).toEqual(new Set());
  });

  test('active and removed intervention event', () => {
    expect(
      filterEventStreamToActive([
        {
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.ACTIVE,
        },
        {
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.REMOVED,
        },
      ]),
    ).toEqual(new Set());
  });

  test('double active and removed intervention event', () => {
    expect(
      filterEventStreamToActive([
        {
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.ACTIVE,
        },
        {
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.ACTIVE,
        },
        {
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.REMOVED,
        },
      ]),
    ).toEqual(new Set());
  });

  test('different active and removed intervention event', () => {
    expect(
      filterEventStreamToActive([
        {
          interventionName: InterventionName.RESET_PASSWORD,
          interventionState: InterventionState.ACTIVE,
        },
        {
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.REMOVED,
        },
      ]),
    ).toEqual(new Set(['RESET_PASSWORD']));
  });
});
