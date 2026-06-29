import { InterventionState } from '../../data-types/constants';
import { InterventionName } from '../../data-types/intervention-name';
import { InMemoryRecordService } from '../../services/dynamo-db-record-service';
import { interventionEventsTableConfig, PersistentInterventionEventsService } from '../intervention-events';

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

    const resposnse = await service.fetchEventsForAccount('1234');

    expect(resposnse).toEqual([event]);
  });

  test('appendEvents', async () => {
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

    const recordService = new InMemoryRecordService<typeof interventionEventsTableConfig.schema>([]);
    const batchWriteSpy = vi.spyOn(recordService, 'batchWrite');
    const service = new PersistentInterventionEventsService(recordService);

    await service.appendEvents([event]);

    expect(batchWriteSpy).toHaveBeenCalledWith([event]);
  });
});
