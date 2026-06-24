import { InterventionEventMessage } from '../../contracts/intervention-events';
import { EventsEnum, InterventionName, InterventionState, TriggerEventsEnum } from '../../data-types/constants';
import { InMemoryInterventionEventsService } from '../../tables/intervention-events';
import persistInterventionEvents, { generateEventsToAppend, persistIgnoredInterventionEvent } from '../persist-intervention-events';

const baseMessage: InterventionEventMessage = {
  component_id: 'test',
  timestamp: 1722953808,
  event_timestamp_ms: 1722953808000,
  user: {
    user_id: '1',
  },
  event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
  extensions: {
    intervention: {
      intervention_code: '01',
      intervention_reason: 'reason',
    },
  },
};

const FIXED_TIMESTAMP = 1781253284370;

describe('persistInterventionEvents', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIMESTAMP);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('persists a new intervention event when no existing events are present', async () => {
    const service = new InMemoryInterventionEventsService([]);
    const fetchEventsSpy = vi.spyOn(service, 'fetchEventsForAccount');
    const appendEventsSpy = vi.spyOn(service, 'appendEvents');

    await persistInterventionEvents(baseMessage, EventsEnum.FRAUD_SUSPEND_ACCOUNT, undefined, service);

    expect(fetchEventsSpy).toHaveBeenCalledExactlyOnceWith('1');
    expect(appendEventsSpy).toHaveBeenCalledExactlyOnceWith([
      {
        accountId: '1',
        componentId: 'test',
        createdAt: FIXED_TIMESTAMP,
        eventId: expect.any(String) as string,
        interventionName: 'TEMPORARY_SUSPENSION',
        interventionReason: 'reason',
        interventionState: 'ACTIVE',
        originatingComponentId: undefined,
        originatorReferenceId: undefined,
        requesterId: undefined,
        sentAt: 1722953808000,
      },
    ]);
  });
});

describe('generateEventsToAppend', () => {
  test('add one intervention', () => {
    const res = generateEventsToAppend(
      [
        {
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.ACTIVE,
        },
      ],
      [],
      baseMessage,
    );

    expect(res).toEqual([
      {
        accountId: '1',
        componentId: 'test',
        createdAt: expect.any(Number) as number,
        eventId: expect.any(String) as string,
        interventionName: 'TEMPORARY_SUSPENSION',
        interventionReason: 'reason',
        interventionState: 'ACTIVE',
        originatingComponentId: undefined,
        originatorReferenceId: undefined,
        requesterId: undefined,
        sentAt: 1722953808000,
      },
    ]);
  });

  test('add one intervention remove one intervention', () => {
    const res = generateEventsToAppend(
      [
        {
          interventionName: InterventionName.RESET_PASSWORD,
          interventionState: InterventionState.ACTIVE,
        },
        {
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.SUPERSEDED,
        },
      ],
      [InterventionName.TEMPORARY_SUSPENSION],
      baseMessage,
    );

    expect(res).toEqual([
      {
        accountId: '1',
        componentId: 'test',
        createdAt: expect.any(Number) as number,
        eventId: expect.any(String) as string,
        interventionName: 'RESET_PASSWORD',
        interventionReason: 'reason',
        interventionState: 'ACTIVE',
        originatingComponentId: undefined,
        originatorReferenceId: undefined,
        requesterId: undefined,
        sentAt: 1722953808000,
      },
      {
        accountId: '1',
        componentId: 'test',
        createdAt: expect.any(Number) as number,
        eventId: expect.any(String) as string,
        interventionName: 'TEMPORARY_SUSPENSION',
        interventionReason: 'reason',
        interventionState: 'SUPERSEDED',
        originatingComponentId: undefined,
        originatorReferenceId: undefined,
        requesterId: undefined,
        sentAt: 1722953808000,
      },
    ]);
  });

  test('remove existing intervention', () => {
    const res = generateEventsToAppend(
      [
        {
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.REMOVED,
        },
      ],
      [InterventionName.TEMPORARY_SUSPENSION],
      baseMessage,
    );

    expect(res).toEqual([
      {
        accountId: '1',
        componentId: 'test',
        createdAt: expect.any(Number) as number,
        eventId: expect.any(String) as string,
        interventionName: 'TEMPORARY_SUSPENSION',
        interventionReason: 'reason',
        interventionState: 'REMOVED',
        originatingComponentId: undefined,
        originatorReferenceId: undefined,
        requesterId: undefined,
        sentAt: 1722953808000,
      },
    ]);
  });
});

describe('persistIgnoredInterventionEvent', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIMESTAMP);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('persists exactly one ignored row when attempted intervention matches the active intervention', async () => {
    const service = new InMemoryInterventionEventsService([
      {
        eventId: 'existing',
        accountId: '1',
        createdAt: 1000,
        interventionName: InterventionName.TEMPORARY_SUSPENSION,
        interventionState: InterventionState.ACTIVE,
        interventionReason: 'original',
        sentAt: 900,
        componentId: 'test',
      },
    ]);
    const appendEventsSpy = vi.spyOn(service, 'appendEvents');

    await persistIgnoredInterventionEvent(
      baseMessage,
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      { blocked: false, suspended: true, resetPassword: false, reproveIdentity: false },
      service,
    );

    expect(appendEventsSpy).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({
        accountId: '1',
        interventionName: InterventionName.TEMPORARY_SUSPENSION,
        interventionState: InterventionState.IGNORED,
        interventionReason: 'reason',
        sentAt: 1722953808000,
        componentId: 'test',
      }),
    ]);
  });

  test('persists only one ignored row when account has two active interventions and only one matches', async () => {
    const service = new InMemoryInterventionEventsService([
      {
        eventId: 'existing-1',
        accountId: '1',
        createdAt: 1000,
        interventionName: InterventionName.RESET_PASSWORD,
        interventionState: InterventionState.ACTIVE,
        interventionReason: 'original',
        sentAt: 900,
        componentId: 'test',
      },
      {
        eventId: 'existing-2',
        accountId: '1',
        createdAt: 1001,
        interventionName: InterventionName.REPROVE_IDENTITY,
        interventionState: InterventionState.ACTIVE,
        interventionReason: 'original',
        sentAt: 900,
        componentId: 'test',
      },
    ]);
    const appendEventsSpy = vi.spyOn(service, 'appendEvents');

    await persistIgnoredInterventionEvent(
      baseMessage,
      EventsEnum.FRAUD_FORCED_USER_PASSWORD_RESET,
      { blocked: false, suspended: false, resetPassword: true, reproveIdentity: true },
      service,
    );

    expect(appendEventsSpy).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({
        interventionName: InterventionName.RESET_PASSWORD,
        interventionState: InterventionState.IGNORED,
      }),
    ]);
  });
});
