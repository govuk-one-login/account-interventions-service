import {
  DynamoDBClient,
  UpdateItemCommand,
  UpdateItemCommandInput,
  DeleteItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { InformationFromTable } from './utility';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import EndPoints from '../apiEndpoints/endpoints';

const dynamoDatabase = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

export async function getRecordFromTable(userId: string): Promise<InformationFromTable | undefined> {
  try {
    console.log('retrieving record from database');
    const getRecordCommand = new QueryCommand({
      TableName: EndPoints.TABLE_NAME,
      KeyConditionExpression: '#pk = :id_value',
      ExpressionAttributeNames: { '#pk': 'pk' },
      ExpressionAttributeValues: { ':id_value': { S: userId } },
    });
    const response = await dynamoDatabase.send(getRecordCommand);
    if (!response || !response.Items) {
      throw new Error('the record is undefined or doesnt exist');
    }
    return unmarshall(response.Items[0]) as InformationFromTable;
  } catch (error) {
    console.log('unable to get record', { error });
  }
}

/**
 * Method for updating items in the database.
 * Note - ensure to align fields when updating the table as it will create fields if they do not exist in the table in DynamoDB.
 * @param userId - userId used to match accounts in the database
 * @param input - object containing fields in the database.
 */
export async function updateItemInTable(userId: string, input: InformationFromTable) {
  try {
    const dynamoConfig: UpdateItemCommandInput = {
      TableName: EndPoints.TABLE_NAME,
      Key: { pk: { S: userId } },
      UpdateExpression: 'SET #AA = :aa, #SA = :sa, #I = :i, #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua',
      ExpressionAttributeNames: {
        '#AA': 'appliedAt',
        '#SA': 'sentAt',
        '#I': 'intervention',
        '#B': 'blocked',
        '#S': 'suspended',
        '#RP': 'resetPassword',
        '#RI': 'reproveIdentity',
        '#UA': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':aa': { N: `${input.appliedAt}` },
        ':sa': { N: `${input.sentAt}` },
        ':i': { S: input.intervention },
        ':b': { BOOL: input.blocked },
        ':s': { BOOL: input.suspended },
        ':rp': { BOOL: input.resetPassword },
        ':ri': { BOOL: input.reproveIdentity },
        ':ua': { N: `${input.updatedAt}` },
      },
    };
    if (dynamoConfig['ExpressionAttributeNames'] && dynamoConfig['ExpressionAttributeValues']) {
      if (input.isAccountDeleted) {
        dynamoConfig['ExpressionAttributeNames']['#IAD'] = 'isAccountDeleted';
        dynamoConfig['ExpressionAttributeValues'][':iad'] = { BOOL: input.isAccountDeleted };
        dynamoConfig['UpdateExpression'] += ', #IAD = :iad';
      }
      if (input.reprovedIdentityAt) {
        dynamoConfig['ExpressionAttributeNames']['#RIA'] = 'reprovedIdentityAt';
        dynamoConfig['ExpressionAttributeValues'][':ria'] = { N: `${input.reprovedIdentityAt}` };
        dynamoConfig['UpdateExpression'] += ', #RIA = :ria';
      }
      if (input.resetPasswordAt) {
        dynamoConfig['ExpressionAttributeNames']['#RPA'] = 'resetPasswordAt';
        dynamoConfig['ExpressionAttributeValues'][':rpa'] = { N: `${input.resetPasswordAt}` };
        dynamoConfig['UpdateExpression'] += ', #RPA = :rpa';
      }
      if (input.deletedAt) {
        dynamoConfig['ExpressionAttributeNames']['#ADA'] = 'accountDeletedAt';
        dynamoConfig['ExpressionAttributeValues'][':ada'] = { N: `${input.deletedAt}` };
        dynamoConfig['UpdateExpression'] += ', #ADA = :ada';
      }
      if (input.auditLevel) {
        dynamoConfig['ExpressionAttributeNames']['#AL'] = 'auditLevel';
        dynamoConfig['ExpressionAttributeValues'][':al'] = { S: input.auditLevel };
        dynamoConfig['UpdateExpression'] += ', #AL = :al';
      }
      if (input.history) {
        dynamoConfig['ExpressionAttributeNames']['#H'] = 'history';
        dynamoConfig['ExpressionAttributeValues'][':h'] = { L: [{ S: input.history }] };
        dynamoConfig['UpdateExpression'] += ', #H = :h';
      }
    }
    const update = new UpdateItemCommand(dynamoConfig);
    await dynamoDatabase.send(update);
  } catch (error) {
    console.log('failed to update the record in the db', { error });
  }
}

/**
 * Method to delete a users record from DynamoDB.
 * @param userId - used to search for the user to delete, the user id of the user.
 */
export async function deleteTestRecord(userId: string): Promise<void> {
  try {
    console.log('deleting test user record');
    const deleteCommand = new DeleteItemCommand({
      TableName: EndPoints.TABLE_NAME,
      Key: { pk: { S: userId } },
    });
    await dynamoDatabase.send(deleteCommand);
  } catch (error) {
    console.log('record did not delete', { error });
  }
}
