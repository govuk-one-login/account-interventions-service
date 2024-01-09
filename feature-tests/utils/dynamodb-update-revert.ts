import { DynamoDatabaseService } from '../../src/services/dynamo-database-service';
import { UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import EndPoints from '../apiEndpoints/endpoints';

const dynamoDatabaseServiceInstance = new DynamoDatabaseService(EndPoints.TABLE_NAME);

const buildFullUserRecord = (
  updatedAt: string,
  appliedAt: string,
  sentAt: string,
  description: string,
  reprovedIdentityAt: string,
  resetPasswordAt: string,
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
      ':ua': { N: updatedAt },
      ':al': { S: auditLevel },
    },
    UpdateExpression:
      'SET #AA = :aa, #SA = :sa, #D = :d, #RIA = :ria, #RPA = :rpa, #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #AL = :al',
  };
  return baseUpdateItemCommandInput;
};

export async function getCurrentInformation(userId: string) {
  return await dynamoDatabaseServiceInstance.getFullAccountInformation(userId);
}

export async function updateAndRevert(
  userId: string,
  updatedAt: string,
  appliedAt: string,
  sentAt: string,
  description: string,
  reprovedIdentityAt: string,
  resetPasswordAt: string,
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
  console.log('updating user record with specified params');
  const userRecords = await dynamoDatabaseServiceInstance.updateUserStatus(userId, input);
  console.log(userRecords);
}

export async function deleteTestRecord(userId: string) {
  const dynamoDatabase = new DynamoDB(EndPoints.TABLE_NAME);
  try {
    console.log('deleting test user record');
    await dynamoDatabase.deleteItem({
      TableName: EndPoints.TABLE_NAME,
      Key: { pk: { S: userId } },
    });
  } catch {
    console.log('record did not delete');
  }
}
