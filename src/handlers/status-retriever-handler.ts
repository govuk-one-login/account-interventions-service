import type { Context, APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AppConfigService } from '../services/app-config-service';
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import { MetricNames, AISInterventionTypes } from '../data-types/constants';
import { TransformedResponseFromDynamoDatabase } from '../data-types/interfaces';
import { DynamoDatabaseService } from '../services/dynamo-database-service';

const appConfig = AppConfigService.getInstance();
const dynamoDatabaseServiceInstance = new DynamoDatabaseService(appConfig.tableName);

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

  const historyQuery = event.queryStringParameters?.['history'];

  try {
    const response = await dynamoDatabaseServiceInstance.queryRecordFromDynamoDatabase(userId);
    if (!response) {
      logger.warn('Query matched no records in DynamoDB.');
      logAndPublishMetric(MetricNames.ACCOUNT_NOT_FOUND);
      const undefinedResponseFromDynamoDatabase: Record<string, any> = {
        updatedAt: undefined,
        appliedAt: undefined,
        sentAt: undefined,
        description: undefined,
        state: {
          blocked: false,
          suspended: false,
          resetPassword: false,
          reproveIdentity: false,
        },
        auditLevel: undefined,
        history: [],
      };

      const undefinedAccount = transformResponseFromDynamoDatabase(undefinedResponseFromDynamoDatabase);

      return {
        statusCode: 200,
        body: JSON.stringify({ intervention: undefinedAccount }),
      };
    }
    if (historyQuery && historyQuery !== '' && historyQuery === 'true') {
      return {
        statusCode: 200,
        body: JSON.stringify({ history: String(response['history']) }),
      };
    }
    const accountStatus = transformResponseFromDynamoDatabase(response);

    return {
      statusCode: 200,
      body: JSON.stringify({ intervention: accountStatus }),
    };
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
    appliedAt: Number(item['appliedAt'] ?? Date.now()),
    sentAt: Number(item['sentAt'] ?? Date.now()),
    description: String(item['intervention'] ?? AISInterventionTypes.AIS_NO_INTERVENTION),
    reprovedIdentityAt: Number(item['reprovedIdentityAt'] ?? undefined),
    resetPasswordAt: Number(item['resetPasswordAt'] ?? undefined),
    state: {
      blocked: Boolean(item['blocked'] ?? false),
      suspended: Boolean(item['suspended'] ?? false),
      resetPassword: Boolean(item['resetPassword'] ?? false),
      reproveIdentity: Boolean(item['reproveIdentity'] ?? false),
    },
    auditLevel: String(item['auditLevel'] ?? 'standard'),
  });
}
