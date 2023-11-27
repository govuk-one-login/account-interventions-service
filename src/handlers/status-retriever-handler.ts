import type { Context, APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AppConfigService } from '../services/app-config-service';
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import { MetricNames, AISInterventionTypes, undefinedResponseFromDynamoDatabase } from '../data-types/constants';
import { AccountStatus, FullAccountInformation, HistoryObject } from '../data-types/interfaces';
import { DynamoDatabaseService } from '../services/dynamo-database-service';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { HistoryStringBuilder } from '../commons/history-string-builder';

const appConfig = AppConfigService.getInstance();
const dynamoDatabaseServiceInstance = new DynamoDatabaseService(appConfig.tableName);

export const handle = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);
  logger.debug('Status-Retriever-Handler.');

  if (!event.pathParameters?.['userId']) {
    logAndPublishMetric(MetricNames.INVALID_SUBJECT_ID);
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
      logAndPublishMetric(MetricNames.ACCOUNT_NOT_FOUND);

      const undefinedAccount = transformResponseFromDynamoDatabase(undefinedResponseFromDynamoDatabase);
      if (historyQuery && historyQuery === 'true') {
        undefinedAccount.history = [];
      }
      return {
        statusCode: 200,
        body: JSON.stringify({ intervention: undefinedAccount }),
      };
    }

    const accountStatus = transformResponseFromDynamoDatabase(response);

    if (historyQuery && historyQuery === 'true') {
      accountStatus.history = response.history ? constructHistoryObjectField(response.history) : [];
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ intervention: accountStatus }),
    };
  } catch (error) {
    logger.error('A problem occurred with the query.', { error });
    logAndPublishMetric(MetricNames.DB_QUERY_ERROR);
  }
  return {
    statusCode: 500,
    body: JSON.stringify({ message: 'Internal Server Error.' }),
  };
};

/**
 * Helper function to remove whitespace from the user id and to validate that the event contains a valid user id
 * @param userId - Obtained from APIGateway
 * @returns the userId that is passed in, trimmed of any whitespace
 */
function validateEvent(userId: string) {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    logger.warn('Attribute invalid: user_id is empty.');
  }
  return trimmedUserId;
}

function transformResponseFromDynamoDatabase(item: FullAccountInformation) {
  const currentTimestampMs = getCurrentTimestamp().milliseconds;
  const accountStatus: AccountStatus = {
    updatedAt: item.updatedAt ?? currentTimestampMs,
    appliedAt: item.appliedAt ?? currentTimestampMs,
    sentAt: item.sentAt ?? currentTimestampMs,
    description: item.intervention ?? AISInterventionTypes.AIS_NO_INTERVENTION,
    state: {
      blocked: item.blocked ?? false,
      suspended: item.suspended ?? false,
      resetPassword: item.resetPassword ?? false,
      reproveIdentity: item.reproveIdentity ?? false,
    },
    auditLevel: item.auditLevel ?? 'standard',
    reprovedIdentityAt: item.reprovedIdentityAt ?? undefined,
    resetPasswordAt: item.resetPasswordAt ?? undefined,
  };
  return accountStatus;
}

function constructHistoryObjectField(input: string[]): HistoryObject[] {
  const historyStringBuilder = new HistoryStringBuilder();
  const arrayOfHistoryStrings = [];
  for (const historyString of input) {
    try {
      const historyObject = historyStringBuilder.getHistoryObject(historyString);
      arrayOfHistoryStrings.push(historyObject);
    } catch (error) {
      logger.error('History string is malformed.', { error });
      logAndPublishMetric(MetricNames.INVALID_HISTORY_STRING);
      continue;
    }
  }
  return arrayOfHistoryStrings;
}
