import type { Context, APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AppConfigService } from '../services/app-config-service';
import { DynamoDbService as DynamoDatabaseService } from '../services/dynamo-db-service';
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import { AISInterventionTypes, MetricNames } from '../data-types/constants';
import { TransformedResponseFromDynamoDatabase } from '../data-types/interfaces';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const appConfig = AppConfigService.getInstance();
const dynamoDBServiceInstance = new DynamoDatabaseService(appConfig.tableName);

export const handle = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);
  logger.debug('Status-Retriever-Handler.');

  const userId = event.pathParameters?.['userId'];
  if (!userId || eventValidation(userId) === '') {
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
      logger.debug('Requested account is not suspended');
      logAndPublishMetric(AISInterventionTypes.AIS_NO_INTERVENTION);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No suspension.' }),
      };
    }
    for (const item of response) {
      const toObject = unmarshall(item);
      const toResponse = transformedResponse(toObject);
      return {
        statusCode: 200,
        body: JSON.stringify({ intervention: toResponse }),
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
 * Helper function to remove whitespace from the user id
 * @param userId - Obtained from APIGateway
 * @returns the userId that is passed in, trimmed of any whitespace
 */
function eventValidation(userId: string) {
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
function transformedResponse(item: Record<string, any>): TransformedResponseFromDynamoDatabase {
  return item = {
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
  };
}
