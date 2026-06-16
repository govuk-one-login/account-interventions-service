import { z } from 'zod';
import { AppConfigService } from '../services/app-config-service';
import { DynamoDBRecordService, RecordService } from '../services/dynamo-db-record-service';
import TableConfig from './table-config';
import { getDBDocClient } from '../services/db-client';

const appConfig = AppConfigService.getInstance();

export enum InterventionState {
  ACTIVE = 'ACTIVE',
  IGNORED = 'IGNORED',
  SUPERSEDED = 'SUPERSEDED',
  MITIGATED = 'MITIGATED',
  REMOVED = 'REMOVED',
}

export enum InterventionName {
  PERMANENT_SUSPENSION = 'PERMANENT_SUSPENSION',
  TEMPORARY_SUSPENSION = 'TEMPORARY_SUSPENSION',
  RESET_PASSWORD = 'RESET_PASSWORD', //pragma: allowlist secret
  REPROVE_IDENTITY = 'REPROVE_IDENTITY',
}

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
});

export const interventionEventsTableConfig: TableConfig<typeof schema> = {
  tableName: appConfig.interventionEventsTableName,
  partitionKeyName: 'accountId',
  schema,
};

export type InterventionEvent = z.infer<typeof schema>;

export interface InterventionEventsService {
  fetchEventsForAccount(accountId: string): Promise<InterventionEvent[]>;
  appendEvents(events: InterventionEvent[]): Promise<void>;
}

export class InMemoryInterventionEventsService implements InterventionEventsService {
  constructor(readonly events: InterventionEvent[]) {}

  fetchEventsForAccount() {
    return Promise.resolve(this.events);
  }

  async appendEvents() {
    await Promise.resolve();
  }
}

export class PersistentInterventionEventsService implements InterventionEventsService {
  constructor(private readonly recordService: RecordService<typeof schema>) {}

  fetchEventsForAccount(accountId: string) {
    return this.recordService.queryByPkAndValidate(accountId);
  }

  async appendEvents(events: InterventionEvent[]) {
    await this.recordService.batchWrite(events);
  }
}

export const getPersistentInterventionEventsService = (): PersistentInterventionEventsService =>
  new PersistentInterventionEventsService(new DynamoDBRecordService(interventionEventsTableConfig, getDBDocClient()));
