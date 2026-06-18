import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { InformationFromTable } from './utility';
import EndPoints from '../apiEndpoints/endpoints';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

const dbDocClient = DynamoDBDocumentClient.from(dynamoClient);

export async function getRecordFromTable(userId: string): Promise<InformationFromTable | undefined> {
  try {
    console.log('retrieving record from database');
    const getRecordCommand = new QueryCommand({
      TableName: EndPoints.TABLE_NAME,
      KeyConditionExpression: '#pk = :id_value',
      ExpressionAttributeNames: { '#pk': 'pk' },
      ExpressionAttributeValues: { ':id_value': userId },
    });
    const response = await dbDocClient.send(getRecordCommand);
    if (!response.Items) {
      throw new Error('the record is undefined or doesnt exist');
    }
    return response.Items[0] as InformationFromTable;
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
    const dynamoConfig: UpdateCommandInput = {
      TableName: EndPoints.TABLE_NAME,
      Key: { pk: userId },
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
        ':aa': input.appliedAt,
        ':sa': input.sentAt,
        ':i': input.intervention,
        ':b': input.blocked,
        ':s': input.suspended,
        ':rp': input.resetPassword,
        ':ri': input.reproveIdentity,
        ':ua': input.updatedAt,
      },
    };
    if (dynamoConfig['ExpressionAttributeNames'] && dynamoConfig['ExpressionAttributeValues']) {
      if (input.isAccountDeleted) {
        dynamoConfig['ExpressionAttributeNames']['#IAD'] = 'isAccountDeleted';
        dynamoConfig['ExpressionAttributeValues'][':iad'] = input.isAccountDeleted;
        dynamoConfig['UpdateExpression'] += ', #IAD = :iad';
      }
      if (input.reprovedIdentityAt) {
        dynamoConfig['ExpressionAttributeNames']['#RIA'] = 'reprovedIdentityAt';
        dynamoConfig['ExpressionAttributeValues'][':ria'] = input.reprovedIdentityAt;
        dynamoConfig['UpdateExpression'] += ', #RIA = :ria';
      }
      if (input.resetPasswordAt) {
        dynamoConfig['ExpressionAttributeNames']['#RPA'] = 'resetPasswordAt';
        dynamoConfig['ExpressionAttributeValues'][':rpa'] = input.resetPasswordAt;
        dynamoConfig['UpdateExpression'] += ', #RPA = :rpa';
      }
      if (input.deletedAt) {
        dynamoConfig['ExpressionAttributeNames']['#ADA'] = 'accountDeletedAt';
        dynamoConfig['ExpressionAttributeValues'][':ada'] = input.deletedAt;
        dynamoConfig['UpdateExpression'] += ', #ADA = :ada';
      }
      if (input.auditLevel) {
        dynamoConfig['ExpressionAttributeNames']['#AL'] = 'auditLevel';
        dynamoConfig['ExpressionAttributeValues'][':al'] = input.auditLevel;
        dynamoConfig['UpdateExpression'] += ', #AL = :al';
      }
      if (input.history) {
        dynamoConfig['ExpressionAttributeNames']['#H'] = 'history';
        dynamoConfig['ExpressionAttributeValues'][':h'] = [input.history];
        dynamoConfig['UpdateExpression'] += ', #H = :h';
      }
    }
    const update = new UpdateCommand(dynamoConfig);
    await dbDocClient.send(update);
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
    const deleteCommand = new DeleteCommand({
      TableName: EndPoints.TABLE_NAME,
      Key: { pk: userId },
    });
    await dbDocClient.send(deleteCommand);
  } catch (error) {
    console.log('record did not delete', { error });
  }
}

export interface InterventionEvent {
  eventId: string;
}

export async function getInterventionEventRecordFromTable(userId: string): Promise<InterventionEvent | undefined> {
  try {
    console.log('retrieving intevention event record from database');
    const getRecordCommand = new QueryCommand({
      TableName: EndPoints.INTERVENTION_EVENTS_TABLE_NAME,
      KeyConditionExpression: '#accountId = :accountId',
      ExpressionAttributeNames: { '#accountId': 'accountId' },
      ExpressionAttributeValues: { ':accountId': userId },
    });
    const response = await dbDocClient.send(getRecordCommand);
    if (!response.Items) {
      throw new Error('the record is undefined or doesnt exist');
    }
    return response.Items[0] as InterventionEvent;
  } catch (error) {
    console.log('unable to get record', { error });
  }
}
