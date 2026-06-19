import z from 'zod';
import { getDBDocumentClient } from '../services/database-client';
import { DynamoDBRecordService, RecordService } from '../services/dynamo-db-record-service';
import TableConfig from './table-config';
import { AppConfigService } from '../services/app-config-service';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { UpdateCommandOutput } from '@aws-sdk/lib-dynamodb';
import { AccountStateEngineOutput, CurrentTimeDescriptor } from '../data-types/interfaces';
import { InterventionEventMessage } from '../contracts/intervention-events';
import { LOGS_PREFIX_SENSITIVE_INFO } from '../data-types/constants';
import { buildPartialUpdateAccountStateCommand } from '../commons/build-partial-update-state-command';
import logger from '../commons/logger';

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
  updateUserStatus(
    accountId: string,
    statusResult: AccountStateEngineOutput,
    currentTimestamp: CurrentTimeDescriptor,
    result: InterventionEventMessage,
    historyList: string[],
  ): Promise<void>;
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

  updateUserStatus() {
    return Promise.resolve(undefined);
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

  async updateUserStatus(
    accountId: string,
    statusResult: AccountStateEngineOutput,
    currentTimestamp: CurrentTimeDescriptor,
    result: InterventionEventMessage,
    historyList: string[],
  ) {
    const partialCommandInput = buildPartialUpdateAccountStateCommand(
      statusResult.stateResult,
      currentTimestamp.milliseconds,
      result,
      historyList,
      statusResult.interventionName,
    );
    logger.debug(`${LOGS_PREFIX_SENSITIVE_INFO} Updating user status`, { userId: accountId, partialCommandInput });
    await this.recordService.update(accountId, partialCommandInput);
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
