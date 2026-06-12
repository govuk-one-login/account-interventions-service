import { InterventionEventMessage } from '../../contracts/intervention-events';
import { EventsEnum, TriggerEventsEnum } from '../../data-types/constants';
import {
  InMemoryInterventionEventsService,
  InterventionName,
  InterventionState,
} from '../../tables/intervention-events';
import persistInterventionEvents, { generateEventsToAppend } from '../persist-intervention-events';

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
