import { DynamoDatabaseService } from '../../src/services/dynamo-database-service';
import { UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import EndPoints from '../apiEndpoints/endpoints';

const dynamoDatabaseServiceInstance = new DynamoDatabaseService(EndPoints.TABLE_NAME);

/**
 * Method to build up the full information of the user in DynamoDB.
 * @param updatedAt - the time the user was updated at.
 * @param appliedAt - the time the intervention was applied at.
 * @param sentAt - the time the intervention was sent at.
 * @param description - the intervention that is applied to the user.
 * @param reprovedIdentityAt - the time the user had reproved their identity.
 * @param resetPasswordAt - the time the user had reset their password.
 * @param state - state of the account, an object containing 4 boolean fields: blocked, suspended, reproveIdentity and resetPassword.
 * @param auditLevel - the audit level of the account.
 * @returns - the input needed for DynamoDB.
 */
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

/**
 * Method for pulling down the users information by using their user id.
 * @param userId - the users user id.
 * @returns - an unmarshalled record from DynamoDB or undefined.
 */
export async function getCurrentInformation(userId: string) {
  return await dynamoDatabaseServiceInstance.getFullAccountInformation(userId);
}

/**
 * Method for updating all of the fields for a user. Uses {@link buildFullUserRecord} as the command input.
 * @returns - the updated information from DynamoDB.
 */
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

/**
 * Method to delete a users record from DynamoDB.
 * @param userId - used to search for the user to delete, the user id of the user.
 */
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
