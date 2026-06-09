import { InMemoryRecordService } from '../../services/dynamo-db-record-service';
import {
  interventionEventsTableConfig,
  InterventionName,
  InterventionState,
  PersistentInterventionEventsService,
} from '../intervention-events';

describe('PersistentInterventionEventsService', () => {
  test('fetchEventsForAccount', async () => {
    const event = {
      eventId: '1232',
      accountId: 'abc',
      interventionId: '13324',
      createdAt: 1234,
      interventionState: InterventionState.ACTIVE,
      interventionName: InterventionName.TEMPORARY_SUSPENSION,
      interventionReason: 'reason',
      sentAt: 1234,
      componentId: 'TEST',
    };

    const service = new PersistentInterventionEventsService(
      new InMemoryRecordService<typeof interventionEventsTableConfig.schema>([event]),
    );

    const res = await service.fetchEventsForAccount('1234');

    expect(res).toEqual([event]);
  });
});
