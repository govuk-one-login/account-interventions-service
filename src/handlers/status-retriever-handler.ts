import type { Context, APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AppConfigService } from '../services/app-config-service';
import logger from '../commons/logger';
import { addMetric, metric } from '../commons/metrics';
import { MetricNames, AISInterventionTypes } from '../data-types/constants';
import { AccountStatus, FullAccountInformation, HistoryObject } from '../data-types/interfaces';
import { DynamoDatabaseService } from '../services/dynamo-database-service';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { HistoryStringBuilder } from '../commons/history-string-builder';

const appConfig = AppConfigService.getInstance();
const dynamoDatabaseServiceInstance = new DynamoDatabaseService(appConfig.tableName);

/**
 * Status Retriever Handler. Queries DynamoDB and returns the intervention status of the account.
 * @param event - Event passed in from API Gateway.
 * @param context - This object provides methods and properties that provide information about the invocation, function, and execution environment.
 * @returns - The status of the account when matched with the User ID. Returns a default object if unable to do so. Also returns the relevant status code.
 */
export const handle = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  logger.debug('I am the new version of the lambda 143!');

  if (!event.pathParameters?.['userId']) {
    addMetric(MetricNames.INVALID_SUBJECT_ID);
    metric.publishStoredMetrics();
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid Request.' }),
    };
  }

  const userId = decodeURIComponent(validateEvent(event.pathParameters?.['userId']));
  const historyQuery = event.queryStringParameters?.['history'];

  try {
    const response = await dynamoDatabaseServiceInstance.getFullAccountInformation(userId);
    if (!response) {
      logger.info('Query matched no records in DynamoDB.');
      addMetric(MetricNames.ACCOUNT_NOT_FOUND);

      const undefinedAccount = transformResponseFromDynamoDatabase({});

      if (historyQuery && historyQuery === 'true') {
        undefinedAccount.history = [];
      }
      metric.publishStoredMetrics();
      return {
        statusCode: 200,
        body: JSON.stringify(undefinedAccount),
      };
    }

    const accountStatus = transformResponseFromDynamoDatabase(response);

    if (historyQuery && historyQuery === 'true') {
      accountStatus.history = response.history ? constructHistoryObjectField(response.history) : [];
    }
    metric.publishStoredMetrics();
    return {
      statusCode: 200,
      body: JSON.stringify(accountStatus),
    };
  } catch (error) {
    logger.error('A problem occurred with the query.', { error });
    addMetric(MetricNames.DB_QUERY_ERROR);
  }
  metric.publishStoredMetrics();
  return {
    statusCode: 500,
    body: JSON.stringify({ message: 'Internal Server Error.' }),
  };
};

/**
 * Helper function to remove whitespace from the user id and to validate that the event contains a valid user id
 * @param userId - Obtained from APIGateway
 * @returns - the userId that is passed in, trimmed of any whitespace
 */
function validateEvent(userId: string) {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    logger.warn('Attribute invalid: user_id is empty.');
  }
  return trimmedUserId;
}

/**
 * Function to transform the response from DynamoDB into an object.
 * @param item - Response from DynamoDB
 * @returns - An object with all the required fields for the handler response. Creates a default object if any fields are undefined.
 * Updates timestamps to now if they are returned as null.
 */
function transformResponseFromDynamoDatabase(item: Partial<FullAccountInformation>) {
  const currentTimestampMs = getCurrentTimestamp().milliseconds;
  const accountStatus: AccountStatus = {
    intervention: {
      updatedAt: item.updatedAt ?? currentTimestampMs,
      appliedAt: item.appliedAt ?? currentTimestampMs,
      sentAt: item.sentAt ?? currentTimestampMs,
      description: item.intervention ?? AISInterventionTypes.AIS_NO_INTERVENTION,
      reprovedIdentityAt: item.reprovedIdentityAt ?? undefined,
      resetPasswordAt: item.resetPasswordAt ?? undefined,
      accountDeletedAt: item.deletedAt ?? undefined,
    },
    state: {
      blocked: item.blocked ?? false,
      suspended: item.suspended ?? false,
      resetPassword: item.resetPassword ?? false,
      reproveIdentity: item.reproveIdentity ?? false,
    },
    auditLevel: item.auditLevel ?? 'standard',
  };
  return accountStatus;
}

/**
 * Function to transform the history string into the required object.
 * @param input - The array of history strings received from DynamoDB when Query Parameters are passed in.
 * @returns - An array of history objects. If any history objects are malformed, it filters them out.
 */
function constructHistoryObjectField(input: string[]): HistoryObject[] {
  const historyStringBuilder = new HistoryStringBuilder();
  const arrayOfHistoryStrings = [];
  for (const historyString of input) {
    try {
      const historyObject = historyStringBuilder.getHistoryObject(historyString);
      arrayOfHistoryStrings.push(historyObject);
    } catch (error) {
      logger.error('History string is malformed.', { error });
      addMetric(MetricNames.INVALID_HISTORY_STRING);
    }
  }
  return arrayOfHistoryStrings;
}
