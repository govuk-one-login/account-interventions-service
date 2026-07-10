import { z } from 'zod';
import { AppConfigService } from '../services/app-config-service';
import { DynamoDBRecordService, RecordService } from '../services/dynamo-db-record-service';
import TableConfig from './table-config';
import { getDBDocumentClient } from '../services/database-client';
import { InterventionState } from '../data-types/constants';
import { InterventionName } from '../data-types/intervention-name';
import { BatchWriteCommandOutput } from '@aws-sdk/lib-dynamodb';

const appConfig = AppConfigService.getInstance();

/* eslint-disable unicorn/max-nested-calls */
const schema = z.object({
  eventId: z.string(),
  accountId: z.string(),
  createdAt: z.number(),
  interventionState: z.enum(InterventionState),
  interventionName: z.enum(InterventionName),
  interventionReason: z.string(),
  sentAt: z.number(),
  componentId: z.string(),
  originatingComponentId: z.string().optional(),
  requesterId: z.string().optional(),
  originatorReferenceId: z.union([z.string(), z.array(z.string())]).optional(),
  ttl: z.number().optional(),
  transactionId: z.string().optional(),
  messageEventId: z.string().optional(),
});

export const interventionEventsTableConfig: TableConfig<typeof schema> = {
  tableName: appConfig.interventionEventsTableName,
  partitionKeyName: 'accountId',
  schema,
};

export type InterventionEvent = z.infer<typeof schema>;

export interface InterventionEventsService {
  fetchEventsForAccount(accountId: string): Promise<InterventionEvent[]>;
  appendEvents(events: InterventionEvent[]): Promise<BatchWriteCommandOutput>;
}

export class InMemoryInterventionEventsService implements InterventionEventsService {
  constructor(readonly events: InterventionEvent[]) {}

  fetchEventsForAccount() {
    return Promise.resolve(this.events);
  }

  appendEvents() {
    return Promise.resolve({
      $metadata: {},
    });
  }
}

export class PersistentInterventionEventsService implements InterventionEventsService {
  constructor(private readonly recordService: RecordService<typeof schema>) {}

  fetchEventsForAccount(accountId: string) {
    return this.recordService.queryByPkAndValidate(accountId);
  }

  appendEvents(events: InterventionEvent[]) {
    return this.recordService.batchWrite(events);
  }
}

export const getPersistentInterventionEventsService = (): PersistentInterventionEventsService =>
  new PersistentInterventionEventsService(
    new DynamoDBRecordService(interventionEventsTableConfig, getDBDocumentClient()),
  );
