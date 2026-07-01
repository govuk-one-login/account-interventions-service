import { InterventionEventMessage } from '../../contracts/intervention-events';
import { EventsEnum, InterventionState, TriggerEventsEnum } from '../../data-types/constants';
import { InterventionName } from '../../data-types/intervention-name';
import { InMemoryInterventionEventsService } from '../../tables/intervention-events';
import persistInterventionEvents, {
  generateEventsToAppend,
  persistIgnoredInterventionEvent,
  setTtlOnInactiveEvents,
} from '../persist-intervention-events';

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

    expect(fetchEventsSpy).toHaveBeenCalledTimes(2);
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
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIMESTAMP);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('add one intervention', () => {
    const response = generateEventsToAppend(
      [
        {
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.ACTIVE,
        },
      ],
      [],
      baseMessage,
    );
    expect(response).toEqual([
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

  test.only('add one intervention remove one intervention', () => {
    const response = generateEventsToAppend(
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

    expect(response).toEqual([
      {
        accountId: '1',
        componentId: 'test',
        createdAt: FIXED_TIMESTAMP,
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
        createdAt: FIXED_TIMESTAMP + 1,
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
    const response = generateEventsToAppend(
      [
        {
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.REMOVED,
        },
      ],
      [InterventionName.TEMPORARY_SUSPENSION],
      baseMessage,
    );

    expect(response).toEqual([
      {
        accountId: '1',
        componentId: 'test',
        createdAt: FIXED_TIMESTAMP,
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

describe('setTtlOnInactiveEvents', () => {
  const FIXED_TIMESTAMP = 1781253284370;
  const EXPECTED_TTL = Math.floor(FIXED_TIMESTAMP / 1000) + 12345;

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIMESTAMP);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('sets ttl on inactive events that do not already have a ttl', async () => {
    const service = new InMemoryInterventionEventsService([
      {
        eventId: 'event-1',
        accountId: '1',
        createdAt: 1000,
        interventionName: InterventionName.TEMPORARY_SUSPENSION,
        interventionState: InterventionState.SUPERSEDED,
        interventionReason: 'reason',
        sentAt: 900,
        componentId: 'test',
      },
    ]);
    const appendEventsSpy = vi.spyOn(service, 'appendEvents');

    await setTtlOnInactiveEvents('1', service, [InterventionName.TEMPORARY_SUSPENSION]);

    expect(appendEventsSpy).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ eventId: 'event-1', ttl: EXPECTED_TTL }),
    ]);
  });

  test('does not set ttl on interventions that are still ACTIVE', async () => {
    const service = new InMemoryInterventionEventsService([
      {
        eventId: 'event-1',
        accountId: '1',
        createdAt: 1000,
        interventionName: InterventionName.RESET_PASSWORD,
        interventionState: InterventionState.ACTIVE,
        interventionReason: 'reason',
        sentAt: 900,
        componentId: 'test',
      },
    ]);
    const appendEventsSpy = vi.spyOn(service, 'appendEvents');

    await setTtlOnInactiveEvents('1', service, [InterventionName.TEMPORARY_SUSPENSION]);

    expect(appendEventsSpy).not.toHaveBeenCalled();
  });

  test('does not rewrite events that already have a ttl', async () => {
    const service = new InMemoryInterventionEventsService([
      {
        eventId: 'event-1',
        accountId: '1',
        createdAt: 1000,
        interventionName: InterventionName.TEMPORARY_SUSPENSION,
        interventionState: InterventionState.REMOVED,
        interventionReason: 'reason',
        sentAt: 900,
        componentId: 'test',
        ttl: 1234567890,
      },
    ]);
    const appendEventsSpy = vi.spyOn(service, 'appendEvents');

    await setTtlOnInactiveEvents('1', service, [InterventionName.TEMPORARY_SUSPENSION]);

    expect(appendEventsSpy).not.toHaveBeenCalled();
  });

  test('does nothing when there are no events for the account', async () => {
    const service = new InMemoryInterventionEventsService([]);
    const appendEventsSpy = vi.spyOn(service, 'appendEvents');

    await setTtlOnInactiveEvents('1', service, [InterventionName.TEMPORARY_SUSPENSION]);

    expect(appendEventsSpy).not.toHaveBeenCalled();
  });

  test('only sets ttl on events matching the closed intervention names', async () => {
    const service = new InMemoryInterventionEventsService([
      {
        eventId: 'event-1',
        accountId: '1',
        createdAt: 1000,
        interventionName: InterventionName.TEMPORARY_SUSPENSION,
        interventionState: InterventionState.SUPERSEDED,
        interventionReason: 'reason',
        sentAt: 900,
        componentId: 'test',
      },
      {
        eventId: 'event-2',
        accountId: '1',
        createdAt: 1001,
        interventionName: InterventionName.RESET_PASSWORD,
        interventionState: InterventionState.REMOVED,
        interventionReason: 'reason',
        sentAt: 901,
        componentId: 'test',
      },
    ]);
    const appendEventsSpy = vi.spyOn(service, 'appendEvents');

    await setTtlOnInactiveEvents('1', service, [InterventionName.TEMPORARY_SUSPENSION]);

    expect(appendEventsSpy).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ eventId: 'event-1', ttl: EXPECTED_TTL }),
    ]);
  });

  test('sets ttl on all events for a closed intervention including the original ACTIVE event', async () => {
    const service = new InMemoryInterventionEventsService([
      {
        eventId: 'event-1',
        accountId: '1',
        createdAt: 1000,
        interventionName: InterventionName.TEMPORARY_SUSPENSION,
        interventionState: InterventionState.ACTIVE,
        interventionReason: 'reason',
        sentAt: 900,
        componentId: 'test',
      },
      {
        eventId: 'event-2',
        accountId: '1',
        createdAt: 2000,
        interventionName: InterventionName.TEMPORARY_SUSPENSION,
        interventionState: InterventionState.SUPERSEDED,
        interventionReason: 'reason',
        sentAt: 1900,
        componentId: 'test',
      },
      {
        eventId: 'event-3',
        accountId: '1',
        createdAt: 2001,
        interventionName: InterventionName.RESET_PASSWORD,
        interventionState: InterventionState.ACTIVE,
        interventionReason: 'reason',
        sentAt: 1901,
        componentId: 'test',
      },
    ]);

    const appendEventsSpy = vi.spyOn(service, 'appendEvents');

    await setTtlOnInactiveEvents('1', service, [InterventionName.TEMPORARY_SUSPENSION]);

    expect(appendEventsSpy).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ eventId: 'event-1', ttl: EXPECTED_TTL }),
      expect.objectContaining({ eventId: 'event-2', ttl: EXPECTED_TTL }),
    ]);
  });
});
