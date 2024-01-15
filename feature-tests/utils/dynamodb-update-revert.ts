import { AttributeValue, DynamoDB, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import EndPoints from '../apiEndpoints/endpoints';

const dynamoDatabase = new DynamoDB({
  apiVersion: '2012-11-05',
  region: process.env.AWS_REGION,
});

type inputObject = {
  updatedAt: string;
  appliedAt: string;
  sentAt: string;
  description: string;
  blocked: boolean;
  suspended: boolean;
  resetPassword: boolean;
  reproveIdentity: boolean;
  history: string[];
  auditLevel: string;
  isAccountDeleted?: boolean;
  reprovedIdentityAt?: string;
  resetPasswordAt?: string;
};

export async function getRecordFromTable(userId: string) {
  try {
    console.log('retrieving record from database');
    const response = await dynamoDatabase.query({
      TableName: EndPoints.TABLE_NAME,
      KeyConditionExpression: '#pk = :id_value',
      ExpressionAttributeNames: { '#pk': 'pk' },
      ExpressionAttributeValues: { ':id_value': { S: userId } },
    });
    if (!response || !response.Items) {
      throw new Error('the record is undefined or doesnt exist');
    }
    return unmarshall(response.Items[0]);
  } catch (error) {
    console.log('unable to get record', { error });
  }
}

export async function updateItemInTable(userId: string, input: inputObject) {
  console.log('input', input);
  const {
    updatedAt,
    appliedAt,
    sentAt,
    description,
    blocked,
    suspended,
    reproveIdentity,
    resetPassword,
    history,
    auditLevel,
    reprovedIdentityAt,
    resetPasswordAt,
    isAccountDeleted,
  } = input;
  const updateRecord: Record<string, AttributeValue> = {
    updatedAt: { S: updatedAt } ?? undefined,
    appliedAt: { S: appliedAt } ?? undefined,
    sentAt: { S: sentAt } ?? undefined,
    intervention: { S: description } ?? undefined,
    blocked: { BOOL: blocked } ?? undefined,
    suspended: { BOOL: suspended } ?? undefined,
    reproveIdentity: { BOOL: reproveIdentity } ?? undefined,
    resetPassword: { BOOL: resetPassword } ?? undefined,
    history: { SS: history } ?? undefined,
    auditLevel: { S: auditLevel } ?? undefined,
  };
  if (reprovedIdentityAt) {
    updateRecord.reprovedIdentityAt = { S: reprovedIdentityAt };
  }
  if (resetPasswordAt) {
    updateRecord.resetPasswordAt = { S: resetPasswordAt };
  }
  if (isAccountDeleted) {
    updateRecord.isAccountDeleted = { BOOL: isAccountDeleted };
  }
  try {
    const dynamoConfig: UpdateItemCommandInput = {
      TableName: EndPoints.TABLE_NAME,
      Key: { pk: { S: userId } },
      UpdateExpression:
        'SET #AA = :aa, #SA = :sa, #D = :d, #RIA = :ria, #RPA = :rpa, #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #AL = :al',
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
        ':aa': updateRecord.appliedAt,
        ':sa': updateRecord.sentAt,
        ':d': updateRecord.description,
        ':ria': updateRecord.reprovedIdentityAt,
        ':rpa': updateRecord.resetPasswordAt,
        ':b': updateRecord.blocked,
        ':s': updateRecord.suspended,
        ':rp': updateRecord.resetPassword,
        ':ri': updateRecord.reproveIdentity,
        ':ua': updateRecord.updatedAt,
        ':al': updateRecord.auditLevel,
      },
    };
    await dynamoDatabase.updateItem(dynamoConfig);
  } catch (error) {
    console.log('failed to update the record in the db', { error });
  }
}

/**
 * Method to delete a users record from DynamoDB.
 * @param userId - used to search for the user to delete, the user id of the user.
 */
export async function deleteTestRecord(userId: string) {
  try {
    console.log('deleting test user record');
    await dynamoDatabase.deleteItem({
      TableName: EndPoints.TABLE_NAME,
      Key: { pk: { S: userId } },
    });
  } catch (error) {
    console.log('record did not delete', { error });
  }
}

// function iterateOverRecord(arr: any[]) {
//   for (let index = 0; index < arr.length; index++) {
//     return arr[index];
//   }
// }
