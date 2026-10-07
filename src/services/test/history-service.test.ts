import { HistoryLine } from '../../data-types/api-schemas-v2';
import { InterventionState } from '../../data-types/constants';
import { InterventionName } from '../../data-types/intervention-name';
import { InMemoryAccountStatusService } from '../../tables/account-status';
import { InMemoryInterventionEventsService } from '../../tables/intervention-events';
import { deduplicateEvents, HistoryIdentifier, HistoryService } from '../history-service';

const markDeduplicated = (accountStatus: HistoryLine[], interventionEvents: HistoryLine[]): HistoryLine[] => [
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

    expect(result).toEqual({ lines: [] });
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
      lines: [
        {
          componentId: 'TCIF',
          interventionCode: '01',
          interventionName: 'TEMPORARY_SUSPENSION',
          interventionReason: 'deduplicated:Reason1',
          interventionState: 'ACTIVE',
          originatingComponentId: 'TICF',
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
          originatingComponentId: 'TICF',
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
          originatingComponentId: 'TICF',
          originatorReferenceId: '123',
          requesterId: 'abc',
          sentAt: 123456,
          tagId: expect.any(String) as string,
        },
      ],
    });

    expect(result.lines[0]?.transactionId).toBe(result.lines[1]?.transactionId);
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
      lines: [
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
      lines: [
        {
          componentId: 'TCIF',
          interventionCode: '01',
          interventionName: 'TEMPORARY_SUSPENSION',
          interventionReason: 'deduplicated:Reason1',
          interventionState: 'ACTIVE',
          originatingComponentId: 'TICF',
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
          originatingComponentId: 'TICF',
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
          originatingComponentId: 'TICF',
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

    expect(result).toEqual({ lines: [] });
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

    expect(result).toEqual({ lines: [] });
  });
});

describe('deduplicateEvents', () => {
  const baseEvent: HistoryIdentifier = {
    interventionName: 'TEMPORARY_SUSPENSION',
    interventionState: 'ACTIVE',
    sentAt: 1000,
    tagId: 'tag-1'
  };

  const matchingInterventionEvent: HistoryIdentifier = {
    interventionName: 'TEMPORARY_SUSPENSION',
    interventionState: 'ACTIVE',
    sentAt: 1000,
    transactionId: 'tx-intervention',
    tagId: 'tag-2'
  };

  it('removes the account status event when all fields match an intervention event', () => {
    const result = deduplicateEvents([baseEvent], [matchingInterventionEvent]);

    expect(result).toEqual([matchingInterventionEvent]);
  });

  it('copies the account status events interventionCode to the matching intervention event', () => {
    const baseEventWithCode: HistoryIdentifier = {
      ...baseEvent,
      interventionCode: '03',
    };

    const matchingInterventionEventWithCode: HistoryIdentifier = {
      ...matchingInterventionEvent,
      interventionCode: '03',
    };
    const result = deduplicateEvents([baseEventWithCode], [matchingInterventionEvent]);

    expect(result).toEqual([matchingInterventionEventWithCode]);
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
      tagId: 'tag-3'
    };

    const result = deduplicateEvents([baseEvent, nonMatchingEvent], [matchingInterventionEvent]);

    expect(result).toEqual([nonMatchingEvent, matchingInterventionEvent]);
    expect(result).toHaveLength(2);
  });

  it('removes all account-status events sharing a tagId when one matches an intervention event', () => {
    // account-status table events
    const suspendActive: HistoryIdentifier = {
      interventionName: 'TEMPORARY_SUSPENSION',
      interventionState: 'ACTIVE',
      sentAt: 1000,
      tagId: 'account-status-tag',
    };
  
    const resetPasswordRemoved: HistoryIdentifier = {
      interventionName: 'RESET_PASSWORD',
      interventionState: 'REMOVED',
      sentAt: 1000,
      tagId: 'account-status-tag',
    };
  
    const reproveIdentityRemoved: HistoryIdentifier = {
      interventionName: 'REPROVE_IDENTITY',
      interventionState: 'REMOVED',
      sentAt: 1000,
      tagId: 'account-status-tag',
    };
  
    // intervention-events table event
    const interventionEvent: HistoryIdentifier = {
      interventionName: 'TEMPORARY_SUSPENSION',
      interventionState: 'ACTIVE',
      sentAt: 1000,
      transactionId: 'tx-1',
      tagId: 'intervention-tag',
    };
  
    const result = deduplicateEvents(
      [suspendActive, resetPasswordRemoved, reproveIdentityRemoved],
      [interventionEvent],
    );
  
    expect(result).toEqual([interventionEvent]);
    expect(result).toHaveLength(1);
  });

  it('removes a matched account-status group while keeping an unmatched group', () => {
    // Old event that only exists in account-status table
    const oldSuspend: HistoryIdentifier = {
      interventionName: 'TEMPORARY_SUSPENSION',
      interventionState: 'ACTIVE',
      sentAt: 1000,
      tagId: 'old-tag',
    };
  
    const oldResetRemoved: HistoryIdentifier = {
      interventionName: 'RESET_PASSWORD',
      interventionState: 'REMOVED',
      sentAt: 1000,
      tagId: 'old-tag',
    };
  
    // Newer event that exists in both tables
    const newerSuspend: HistoryIdentifier = {
      interventionName: 'TEMPORARY_SUSPENSION',
      interventionState: 'ACTIVE',
      sentAt: 2000,
      tagId: 'newer-account-status-tag',
    };
  
    const newerResetRemoved: HistoryIdentifier = {
      interventionName: 'RESET_PASSWORD',
      interventionState: 'REMOVED',
      sentAt: 2000,
      tagId: 'newer-account-status-tag',
    };
  
    // Event in intervention-events table
    const newerInterventionEvent: HistoryIdentifier = {
      interventionName: 'TEMPORARY_SUSPENSION',
      interventionState: 'ACTIVE',
      sentAt: 2000,
      transactionId: 'tx-2',
      tagId: 'intervention-tag',
    };
  
    const result = deduplicateEvents(
      [oldSuspend, oldResetRemoved, newerSuspend, newerResetRemoved],
      [newerInterventionEvent],
    );
  
    // Old group kept, newer group removed in favour of intervention event
    expect(result).toEqual([oldSuspend, oldResetRemoved, newerInterventionEvent]);
    expect(result).toHaveLength(3);
  });
});
