import { HistoryObject } from '../../data-types/api-schemas-v2';
import { InterventionState } from '../../data-types/constants';
import { InterventionName } from '../../data-types/intervention-name';
import { InMemoryAccountStatusService } from '../../tables/account-status';
import { InMemoryInterventionEventsService } from '../../tables/intervention-events';
import { deduplicateEvents, HistoryIdentifier, HistoryService } from '../history-service';

const markDeduplicated = (accountStatus: HistoryObject[], interventionEvents: HistoryObject[]): HistoryObject[] => [
  ...accountStatus.map((event) => ({ ...event, interventionReason: `deduplicated:${event.interventionReason}` })),
  ...interventionEvents.map((event) => ({ ...event, interventionReason: `deduplicated:${event.interventionReason}` })),
];

describe('History Service', () => {
  it('returns an empty array for no events', async () => {
    const service = new HistoryService(
      new InMemoryAccountStatusService(),
      new InMemoryInterventionEventsService([]),
      markDeduplicated,
    );

    const result = await service.fetchHistory('user1234');

    expect(result).toEqual({ history: [] });
  });

  it('returns expected result for a single account status history', async () => {
    const service = new HistoryService(
      new InMemoryAccountStatusService({
        status: {
          pk: 'user1234',
          sentAt: 123456,
          appliedAt: 123456789,
          isAccountDeleted: false,
          history: ['123456|TCIF|01|Reason1|TICF|123|abc'],
          intervention: '01',
          blocked: false,
          suspended: true,
          resetPassword: false,
          reproveIdentity: false,
        },
      }),
      new InMemoryInterventionEventsService([]),
      markDeduplicated,
    );

    const result = await service.fetchHistory('user1234');

    expect(result).toEqual({
      history: [
        {
          componentId: 'TCIF',
          interventionCode: '01',
          interventionName: 'TEMPORARY_SUSPENSION',
          interventionReason: 'deduplicated:Reason1',
          interventionState: 'ACTIVE',
          originatingComponent: 'TICF',
          originatorReferenceId: '123',
          requesterId: 'abc',
          sentAt: 123456,
          tagId: expect.any(String) as string,
        },
        {
          componentId: 'TCIF',
          interventionCode: '01',
          interventionName: 'RESET_PASSWORD',
          interventionReason: 'deduplicated:Reason1',
          interventionState: 'REMOVED',
          originatingComponent: 'TICF',
          originatorReferenceId: '123',
          requesterId: 'abc',
          sentAt: 123456,
          tagId: expect.any(String) as string,
        },
        {
          componentId: 'TCIF',
          interventionCode: '01',
          interventionName: 'REPROVE_IDENTITY',
          interventionReason: 'deduplicated:Reason1',
          interventionState: 'REMOVED',
          originatingComponent: 'TICF',
          originatorReferenceId: '123',
          requesterId: 'abc',
          sentAt: 123456,
          tagId: expect.any(String) as string,
        },
      ],
    });

    expect(result.history[0]?.transactionId).toBe(result.history[1]?.transactionId);
  });

  it('returns expected result for a single intervention event', async () => {
    const service = new HistoryService(
      new InMemoryAccountStatusService(),
      new InMemoryInterventionEventsService([
        {
          eventId: '123456789',
          accountId: 'user1234',
          createdAt: 123456,
          interventionState: InterventionState.ACTIVE,
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionReason: 'Reason2',
          sentAt: 12345,
          componentId: 'TICF',
          transactionId: 'abc1234',
        },
      ]),
      markDeduplicated,
    );

    const result = await service.fetchHistory('user1234');

    expect(result).toEqual({
      history: [
        {
          accountId: 'user1234',
          componentId: 'TICF',
          createdAt: 123456,
          eventId: '123456789',
          interventionName: 'TEMPORARY_SUSPENSION',
          interventionReason: 'deduplicated:Reason2',
          interventionState: 'ACTIVE',
          sentAt: 12345,
          transactionId: 'abc1234',
          tagId: 'abc1234',
        },
      ],
    });
  });

  it('returns expected result for a combination of account status history and intervention events', async () => {
    const service = new HistoryService(
      new InMemoryAccountStatusService({
        status: {
          pk: 'user1234',
          sentAt: 123456,
          appliedAt: 123456789,
          isAccountDeleted: false,
          history: ['123456|TCIF|01|Reason1|TICF|123|abc'],
          intervention: '01',
          blocked: false,
          suspended: true,
          resetPassword: false,
          reproveIdentity: false,
        },
      }),
      new InMemoryInterventionEventsService([
        {
          eventId: '123456789',
          accountId: 'user1234',
          createdAt: 123456,
          interventionState: InterventionState.ACTIVE,
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionReason: 'Reason2',
          sentAt: 12345,
          componentId: 'TICF',
          transactionId: 'abc1234',
        },
      ]),
      markDeduplicated,
    );

    const result = await service.fetchHistory('user1234');

    expect(result).toEqual({
      history: [
        {
          componentId: 'TCIF',
          interventionCode: '01',
          interventionName: 'TEMPORARY_SUSPENSION',
          interventionReason: 'deduplicated:Reason1',
          interventionState: 'ACTIVE',
          originatingComponent: 'TICF',
          originatorReferenceId: '123',
          requesterId: 'abc',
          sentAt: 123456,
          tagId: expect.any(String) as string,
        },
        {
          componentId: 'TCIF',
          interventionCode: '01',
          interventionName: 'RESET_PASSWORD',
          interventionReason: 'deduplicated:Reason1',
          interventionState: 'REMOVED',
          originatingComponent: 'TICF',
          originatorReferenceId: '123',
          requesterId: 'abc',
          sentAt: 123456,
          tagId: expect.any(String) as string,
        },
        {
          componentId: 'TCIF',
          interventionCode: '01',
          interventionName: 'REPROVE_IDENTITY',
          interventionReason: 'deduplicated:Reason1',
          interventionState: 'REMOVED',
          originatingComponent: 'TICF',
          originatorReferenceId: '123',
          requesterId: 'abc',
          sentAt: 123456,
          tagId: expect.any(String) as string,
        },
        {
          accountId: 'user1234',
          componentId: 'TICF',
          createdAt: 123456,
          eventId: '123456789',
          interventionName: 'TEMPORARY_SUSPENSION',
          interventionReason: 'deduplicated:Reason2',
          interventionState: 'ACTIVE',
          sentAt: 12345,
          transactionId: 'abc1234',
          tagId: 'abc1234',
        },
      ],
    });
  });

  it('handles invalid history string', async () => {
    const service = new HistoryService(
      new InMemoryAccountStatusService({
        status: {
          pk: 'user1234',
          sentAt: 123456,
          appliedAt: 123456789,
          isAccountDeleted: false,
          history: ['invalid'],
          intervention: '01',
          blocked: false,
          suspended: true,
          resetPassword: false,
          reproveIdentity: false,
        },
      }),
      new InMemoryInterventionEventsService([]),
      markDeduplicated,
    );

    const result = await service.fetchHistory('user1234');

    expect(result).toEqual({ history: [] });
  });

  it('handles a history string with an invalid intervention code', async () => {
    const service = new HistoryService(
      new InMemoryAccountStatusService({
        status: {
          pk: 'user1234',
          sentAt: 123456,
          appliedAt: 123456789,
          isAccountDeleted: false,
          history: ['123456|TCIF|XX|SomeReason|TICF|123|abc'],
          intervention: '01',
          blocked: false,
          suspended: true,
          resetPassword: false,
          reproveIdentity: false,
        },
      }),
      new InMemoryInterventionEventsService([]),
      markDeduplicated,
    );

    const result = await service.fetchHistory('user1234');

    expect(result).toEqual({ history: [] });
  });

  it('handles invalid history string', async () => {
    const service = new HistoryService(
      new InMemoryAccountStatusService({
        status: {
          pk: 'user1234',
          sentAt: 123456,
          appliedAt: 123456789,
          isAccountDeleted: false,
          history: ['invalid'],
          intervention: '01',
          blocked: false,
          suspended: true,
          resetPassword: false,
          reproveIdentity: false,
        },
      }),
      new InMemoryInterventionEventsService([]),
    );

    const result = await service.fetchHistory('user1234');

    expect(result).toEqual({
      history: [],
    });

    expect(result.history[0]?.transactionId).toBe(result.history[1]?.transactionId);
  });
});

describe('deduplicateEvents', () => {
  const baseEvent: HistoryIdentifier = {
    interventionName: 'TEMPORARY_SUSPENSION',
    interventionState: 'ACTIVE',
    sentAt: 1000,
    transactionId: 'tx-account-status',
  };

  const matchingInterventionEvent: HistoryIdentifier = {
    interventionName: 'TEMPORARY_SUSPENSION',
    interventionState: 'ACTIVE',
    sentAt: 1000,
    transactionId: 'tx-intervention',
  };

  it('removes the account status event when all fields match an intervention event', () => {
    const result = deduplicateEvents([baseEvent], [matchingInterventionEvent]);

    expect(result).toEqual([matchingInterventionEvent]);
  });

  it('does not deduplicate when interventionName differs', () => {
    const differentNameEvent: HistoryIdentifier = {
      ...matchingInterventionEvent,
      interventionName: 'RESET_PASSWORD',
    };

    const result = deduplicateEvents([baseEvent], [differentNameEvent]);

    expect(result).toEqual([baseEvent, differentNameEvent]);
  });

  it('does not deduplicate when interventionState differs', () => {
    const differentStateEvent: HistoryIdentifier = {
      ...matchingInterventionEvent,
      interventionState: 'REMOVED',
    };

    const result = deduplicateEvents([baseEvent], [differentStateEvent]);

    expect(result).toEqual([baseEvent, differentStateEvent]);
  });

  it('does not deduplicate when sentAt differs', () => {
    const differentSentAtEvent: HistoryIdentifier = {
      ...matchingInterventionEvent,
      sentAt: 2000,
    };

    const result = deduplicateEvents([baseEvent], [differentSentAtEvent]);

    expect(result).toEqual([baseEvent, differentSentAtEvent]);
  });

  it('returns all intervention events even when no account status events exist', () => {
    const result = deduplicateEvents([], [matchingInterventionEvent]);

    expect(result).toEqual([matchingInterventionEvent]);
  });

  it('returns all account status events when no intervention events exist', () => {
    const result = deduplicateEvents([baseEvent], []);

    expect(result).toEqual([baseEvent]);
  });

  it('only removes account status events that match, keeping non-matching ones', () => {
    const nonMatchingEvent: HistoryIdentifier = {
      interventionName: 'REPROVE_IDENTITY',
      interventionState: 'REMOVED',
      sentAt: 5000,
      transactionId: 'tx-other',
    };

    const result = deduplicateEvents([baseEvent, nonMatchingEvent], [matchingInterventionEvent]);

    expect(result).toEqual([nonMatchingEvent, matchingInterventionEvent]);
  });
});
