import { DynamoDatabaseService } from '../../src/services/dynamo-database-service';
import { AppConfigService } from '../../src/services/app-config-service';
import { UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const appConfig = AppConfigService.getInstance();
const dynamoDatabaseServiceInstance = new DynamoDatabaseService(appConfig.tableName);

const buildFullUserRecord = (
  updatedAt: number,
  appliedAt: number,
  sentAt: number,
  description: string,
  reprovedIdentityAt: number,
  resetPasswordAt: number,
  state: {
    blocked: boolean;
    suspended: boolean;
    reproveIdentity: boolean;
    resetPassword: boolean;
  },
  auditLevel: string,
): Partial<UpdateItemCommandInput> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseUpdateItemCommandInput: Record<string, any> = {
    ExpressionAttributeNames: {
      '#AA': 'appliedAt',
      '#SA': 'sentAt',
      '#D': 'description',
      '#RIA': 'reprovedIdentityAt',
      '#RPA': 'resetPasswordAt',
      '#B': 'blocked',
      '#S': 'suspended',
      '#RP': 'resetPassword',
      '#RI': 'reproveIdentity',
      '#UA': 'updatedAt',
      '#AL': 'auditLevel',
    },
    ExpressionAttributeValues: {
      ':aa': { N: appliedAt },
      ':sa': { N: sentAt },
      ':d': { S: description },
      ':ria': { N: reprovedIdentityAt },
      ':rpa': { N: resetPasswordAt },
      ':b': { BOOL: state.blocked },
      ':s': { BOOL: state.suspended },
      ':rp': { BOOL: state.resetPassword },
      ':ri': { BOOL: state.reproveIdentity },
      ':ua': { N: `${updatedAt}` },
      ':al': { S: auditLevel },
    },
    UpdateExpression:
      'SET #AA = :aa, #SA = :sa, #D = :d, #RIA = :ria, #RPA = :rpa, #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #AL = :al',
  };
  return baseUpdateItemCommandInput;
};

export async function getCurrentInformation(userId: string) {
  await dynamoDatabaseServiceInstance.getFullAccountInformation(userId);
}

export async function updateAndRevert(
  userId: string,
  updatedAt: number,
  appliedAt: number,
  sentAt: number,
  description: string,
  reprovedIdentityAt: number,
  resetPasswordAt: number,
  state: {
    blocked: boolean;
    suspended: boolean;
    reproveIdentity: boolean;
    resetPassword: boolean;
  },
  auditLevel: string,
) {
  const input = buildFullUserRecord(
    updatedAt,
    appliedAt,
    sentAt,
    description,
    reprovedIdentityAt,
    resetPasswordAt,
    state,
    auditLevel,
  );
  return await dynamoDatabaseServiceInstance.updateUserStatus(userId, input);
}

export async function deleteTestRecord(userId: string) {
  const dynamoDatabase = new DynamoDB(appConfig.tableName);
  await dynamoDatabase.deleteItem({
    TableName: appConfig.tableName,
    Key: { pk: { S: userId } },
  });
}
