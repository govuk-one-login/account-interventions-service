import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { InformationFromTable } from './utility';
import EndPoints from '../apiEndpoints/endpoints';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
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

export async function getInterventionEventsRecordsFromTable(userId: string) {
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
    return response.Items;
  } catch (error) {
    console.log('unable to get record', { error });
  }
}

/**
 * A single intervention-events row a feature test may seed. `accountId` (partition key) and
 * `createdAt` (sort key, in milliseconds) are required; `ttl` is optional so a test can seed a row
 * that either has or lacks a TTL. The remaining fields mirror the shape a real intervention event
 * persists, and are optional so a test only sets what it asserts on.
 */
export interface InterventionEventRecord {
  accountId: string;
  createdAt: number;
  ttl?: number;
  ttlSource?: string;
  componentId?: string;
  eventId?: string;
  interventionName?: string;
  interventionReason?: string;
  interventionState?: string;
  sentAt?: number;
}

/**
 * Seed a single row into the intervention-events table so a backfill scan has deterministic input.
 * @param item - the row to write; see InterventionEventRecord for the required and optional fields
 */
export async function putInterventionEventRecord(item: InterventionEventRecord): Promise<void> {
  try {
    console.log('seeding intervention event record into database');
    const putCommand = new PutCommand({
      TableName: EndPoints.INTERVENTION_EVENTS_TABLE_NAME,
      Item: item,
    });
    await dbDocClient.send(putCommand);
  } catch (error) {
    console.log('unable to seed intervention event record', { error });
  }
}

/**
 * Delete a single seeded intervention-events row, keyed on its partition and sort key, so a test
 * cleans up after itself and does not leave rows in the shared table.
 * @param accountId - the partition key of the row to delete
 * @param createdAt - the sort key (milliseconds) of the row to delete
 */
export async function deleteInterventionEventRecord(accountId: string, createdAt: number): Promise<void> {
  try {
    console.log('deleting seeded intervention event record');
    const deleteCommand = new DeleteCommand({
      TableName: EndPoints.INTERVENTION_EVENTS_TABLE_NAME,
      Key: { accountId, createdAt },
    });
    await dbDocClient.send(deleteCommand);
  } catch (error) {
    console.log('intervention event record did not delete', { error });
  }
}
