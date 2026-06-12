import logger from '../../commons/logger';
import { InterventionEventMessage } from '../../contracts/intervention-events';
import { EventsEnum, TriggerEventsEnum } from '../../data-types/constants';
import {
  InMemoryInterventionEventsService,
  InterventionName,
  InterventionState,
} from '../../tables/intervention-events';
import persistInterventionEvents, { generateEventsToAppend } from '../persist-intervention-events';

const loggerDebugSpy = vi.spyOn(logger, 'debug');

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

describe('persistInterventionEvents', () => {
  test('persists a new intervention event when no existing events are present', async () => {
    await persistInterventionEvents(
      baseMessage,
      EventsEnum.FRAUD_SUSPEND_ACCOUNT,
      undefined,
      new InMemoryInterventionEventsService([]),
    );

    expect(loggerDebugSpy).toHaveBeenNthCalledWith(1, 'Sensitive info - Fetched existingInterventionEvents []');
    expect(loggerDebugSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(
        /^Sensitive info - Intervention events to add \[{"interventionName":"TEMPORARY_SUSPENSION","interventionState":"ACTIVE","eventId":".+","accountId":"1","createdAt":\d+,"interventionReason":"reason","sentAt":1722953808000,"componentId":"test"}\]$/,
      ),
    );
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
