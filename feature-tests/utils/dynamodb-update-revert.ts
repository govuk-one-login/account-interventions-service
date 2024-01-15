import { DynamoDB, UpdateItemCommand, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import EndPoints from '../apiEndpoints/endpoints';
import { inputObjectForUpdatingItem } from './utility';

const dynamoDatabase = new DynamoDB({
  apiVersion: '2012-11-05',
  region: process.env.AWS_REGION,
});

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

/**
 * Method for updating items in the database.
 * @param userId - userId used to match accounts in the database
 * @param input - object containing fields in the database.
 */
export async function updateItemInTable(userId: string, input: inputObjectForUpdatingItem) {
  console.log('input', input);
  try {
    const dynamoConfig: UpdateItemCommandInput = {
      TableName: EndPoints.TABLE_NAME,
      Key: { pk: { S: userId } },
      UpdateExpression:
        'SET #AA = :aa, #SA = :sa, #I = :i, #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #AL = :al, #H = :h',
      ExpressionAttributeNames: {
        '#AA': 'appliedAt',
        '#SA': 'sentAt',
        '#I': 'intervention',
        '#B': 'blocked',
        '#S': 'suspended',
        '#RP': 'resetPassword',
        '#RI': 'reproveIdentity',
        '#UA': 'updatedAt',
        '#AL': 'auditLevel',
        '#H': 'history',
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
        ':al': { S: input.auditLevel },
        ':h': { L: [{ S: input.history }] },
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
    }
    const dynamo = new DynamoDBClient({
      region: process.env.AWS_REGION,
    });
    const update = new UpdateItemCommand(dynamoConfig);
    await dynamo.send(update);
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
