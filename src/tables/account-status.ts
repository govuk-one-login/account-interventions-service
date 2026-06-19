import z from 'zod';
import { getDBDocumentClient } from '../services/database-client';
import { DynamoDBRecordService, RecordService } from '../services/dynamo-db-record-service';
import TableConfig from './table-config';
import { AppConfigService } from '../services/app-config-service';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { UpdateCommandOutput } from '@aws-sdk/lib-dynamodb';

const appConfig = AppConfigService.getInstance();

const schema = z.object({
  sentAt: z.number(),
  appliedAt: z.number(),
  isAccountDeleted: z.boolean(),
  history: z.array(z.string()),
  intervention: z.string(),
  blocked: z.boolean(),
  suspended: z.boolean(),
  resetPassword: z.boolean(),
  reproveIdentity: z.boolean(),
});

export const accountStatusTableConfig: TableConfig<typeof schema> = {
  tableName: appConfig.tableName,
  partitionKeyName: 'pk',
  schema,
};

export type AccountStatus = z.infer<typeof schema>;

export interface AccountStatusService {
  getAccountStateInformation(accountId: string): Promise<AccountStatus | undefined>;
  getFullAccountInformation(accountId: string): Promise<AccountStatus | undefined>;
  updateDeleteStatus(accountId: string): Promise<UpdateCommandOutput | undefined>;
}

export class InMemoryAccountStatusService implements AccountStatusService {
  constructor(
    readonly status?: AccountStatus,
    readonly error?: Error,
  ) {}

  getAccountStateInformation() {
    if (this.error) return Promise.reject(this.error);

    return Promise.resolve(this.status);
  }

  getFullAccountInformation() {
    if (this.error) return Promise.reject(this.error);

    return Promise.resolve(this.status);
  }

  updateDeleteStatus() {
    if (this.error) return Promise.reject(this.error);

    return Promise.resolve(undefined);
  }
}

export class PersistentAccountStatusService implements AccountStatusService {
  constructor(private readonly recordService: RecordService<typeof schema>) {}

  getAccountStateInformation(accountId: string) {
    return this.recordService.getByPkAndValidate(accountId, [
      'blocked',
      'suspended',
      'resetPassword',
      'reproveIdentity',
      'sentAt',
      'appliedAt',
      'isAccountDeleted',
      'history',
      'intervention',
    ]);
  }

  getFullAccountInformation(accountId: string) {
    return this.recordService.getByPkAndValidate(accountId);
  }

  updateDeleteStatus(accountId: string) {
    const now = getCurrentTimestamp();
    const ttl = now.seconds + appConfig.maxRetentionSeconds;

    return this.recordService.update(accountId, {
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted, #ttl = :ttl, #deletedAt = :deletedAt',
      ExpressionAttributeNames: {
        '#isAccountDeleted': 'isAccountDeleted',
        '#ttl': 'ttl',
        '#deletedAt': 'deletedAt',
      },
      ExpressionAttributeValues: {
        ':isAccountDeleted': true,
        ':ttl': ttl,
        ':false': false,
        ':deletedAt': now.milliseconds,
      },
      ReturnValues: 'ALL_NEW',
      ConditionExpression:
        'attribute_exists(pk) AND (attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false)',
    });
  }
}

export const getPersistentAccountStatusService = (): PersistentAccountStatusService =>
  new PersistentAccountStatusService(new DynamoDBRecordService(accountStatusTableConfig, getDBDocumentClient()));
