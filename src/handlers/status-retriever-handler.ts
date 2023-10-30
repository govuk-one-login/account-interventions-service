import type { Context, APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AppConfigService } from '../services/app-config-service';
import { DynamoDbService as DynamoDatabaseService } from '../services/dynamo-db-service';
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import { MetricNames } from '../data-types/constants';
import { TransformedResponseFromDynamoDatabase } from '../data-types/interfaces';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const appConfig = AppConfigService.getInstance();
const dynamoDBServiceInstance = new DynamoDatabaseService(appConfig.tableName);

export const handle = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);
  logger.debug('Status-Retriever-Handler.');

  const userId = event.pathParameters?.['userId'];
  if (!userId || validateEvent(userId) === '') {
    logger.error('Subject ID is possibly undefined or empty');
    logAndPublishMetric(MetricNames.INVALID_SUBJECT_ID);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid Request.' }),
    };
  }

  try {
    const response = await dynamoDBServiceInstance.retrieveRecordsByUserId(userId);
    if (!response || response.length === 0) {
      logAndPublishMetric(MetricNames.ACCOUNT_NOT_SUSPENDED);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No suspension.' }),
      };
    }
    for (const item of response) {
      const unmarshalledObject = unmarshall(item);
      const accountStatus = transformResponseFromDynamoDatabase(unmarshalledObject);

      if (identifyAccountStateIsNotSuspended(accountStatus) === true) {
          logAndPublishMetric(MetricNames.ACCOUNT_NOT_SUSPENDED);
          return {
            statusCode: 200,
            body: JSON.stringify({ message: 'No suspension.' }),
          };
        } 

      return {
        statusCode: 200,
        body: JSON.stringify({ intervention: accountStatus }),
      };
    }
  } catch (error) {
    logger.error('A problem occured with the query', { error });
    logAndPublishMetric(MetricNames.DB_QUERY_ERROR_NO_RESPONSE);
  }
  return {
    statusCode: 500,
    body: JSON.stringify({ message: 'Unable to retrieve records.' }),
  };
};

/**
 * Helper function to remove whitespace from the user id and to validate that the event contains a valid user id
 * @param userId - Obtained from APIGateway
 * @returns the userId that is passed in, trimmed of any whitespace
 */
function validateEvent(userId: string) {
  if (userId.trim() === '') {
    logger.error('Attribute invalid: user_id is empty.');
  }
  return userId.trim();
}

/**
 * Helper function to transform the data from dynamodb
 * @param item - recieved from dynamodb
 * @returns transformed object
 */
function transformResponseFromDynamoDatabase(item: Record<string, any>): TransformedResponseFromDynamoDatabase {
  return (item = {
    updatedAt: Number(item['updatedAt'] ?? Date.now()),
    appliedAt: Number(item['appliedAt']),
    sentAt: Number(item['sentAt']),
    description: String(item['intervention']),
    reprovedIdentityAt: Number(item['reprovedIdentityAt']),
    resetPasswordAt: Number(item['resetPasswordAt']),
    state: {
      blocked: Boolean(item['blocked']),
      suspended: Boolean(item['suspended']),
      resetPassword: Boolean(item['resetPassword']),
      reproveIdentity: Boolean(item['reproveIdentity']),
    },
    auditLevel: String(item['auditLevel']),
  });
}

/**
 * Helper function to determine if the record's state object all has false values
 * @param accountItem - recieved from dynamoDB, transformed via transformResponseFromDynamoDatabase
 * @returns boolean, true if all items in the state object are false, false if not.
 */
function identifyAccountStateIsNotSuspended(accountItem: TransformedResponseFromDynamoDatabase) {
  return Object.values(accountItem.state).every(item => item === false);
}
