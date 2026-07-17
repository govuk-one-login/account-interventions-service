import type { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import logger from '../commons/logger';
import { addMetric, metric } from '../commons/metrics';
import { MetricNames, AISInterventionTypes } from '../data-types/constants';
import { HistoryObject } from '../data-types/interfaces';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { HistoryStringBuilder } from '../commons/history-string-builder';
import getActiveInterventions from '../services/active-interventions-service';
import { InterventionEventsService } from '../tables/intervention-events';
import { UserIdParameterSchema, V1QuerySchema } from '../data-types/api-parameters';
import { AccountStatus, AccountStatusService } from '../tables/account-status';
import { V1Response } from '../data-types/api-schemas-v1';
import { HistoryService } from '../services/history-service';

export async function retrieveStatus(
  event: APIGatewayEvent,
  accountStatusService: AccountStatusService,
  interventionEventsService: InterventionEventsService,
): Promise<APIGatewayProxyResult> {
  const parameters = UserIdParameterSchema.safeParse(event.pathParameters);
  if (!parameters.success) {
    addMetric(MetricNames.INVALID_SUBJECT_ID);
    metric.publishStoredMetrics();
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid Request.' }),
    };
  }

  logger.info('This is a comment for tests');

  const userId = decodeURIComponent(parameters.data.userId);

  try {
    if (event.resource === '/v2/ais/{userId}')
      return await v2StatusApiHandler(userId, accountStatusService, interventionEventsService);

    if (event.resource === '/v2/ais/{userId}/history')
      return await v2HistoryApiHandler(userId, accountStatusService, interventionEventsService);

    const { history: historyQuery } = V1QuerySchema.parse(event.queryStringParameters ?? {});

    return await v1StatusApiHandler(userId, historyQuery, accountStatusService);
  } catch (error) {
    logger.error('A problem occurred with the query.', { error });
    addMetric(MetricNames.DB_QUERY_ERROR);
  }

  metric.publishStoredMetrics();

  return {
    statusCode: 500,
    body: JSON.stringify({ message: 'Internal Server Error.' }),
  };
}

async function v1StatusApiHandler(
  userId: string,
  historyQuery: boolean | undefined,
  accountStatusService: AccountStatusService,
) {
  const response = await accountStatusService.getFullAccountInformation(userId);
  if (!response) {
    logger.info('Query matched no records in DynamoDB.');
    addMetric(MetricNames.ACCOUNT_NOT_FOUND);

    const undefinedAccount = transformResponseFromDynamoDatabase({});

    if (historyQuery) undefinedAccount.history = [];

    metric.publishStoredMetrics();
    return {
      statusCode: 200,
      body: JSON.stringify(undefinedAccount),
    };
  }

  const accountStatus = transformResponseFromDynamoDatabase(response);

  if (historyQuery) accountStatus.history = constructHistoryObjectField(response.history);

  metric.publishStoredMetrics();
  return {
    statusCode: 200,
    body: JSON.stringify(accountStatus),
  };
}

async function v2StatusApiHandler(
  userId: string,
  accountStatusService: AccountStatusService,
  interventionEventsService: InterventionEventsService,
) {
  logger.debug('v2 endpoint');

  const response = await accountStatusService.getAccountStateInformation(userId);
  if (!response) {
    logger.info('Query matched no records in DynamoDB.');
    addMetric(MetricNames.ACCOUNT_NOT_FOUND);

    metric.publishStoredMetrics();
    return {
      statusCode: 200,
      body: JSON.stringify({
        interventions: [],
      }),
    };
  }

  const activeInterventions = await getActiveInterventions(userId, interventionEventsService, response);

  return {
    statusCode: 200,
    body: JSON.stringify({
      interventions: activeInterventions.map((name) => ({
        name,
      })),
    }),
  };
}

async function v2HistoryApiHandler(
  userId: string,
  accountStatusService: AccountStatusService,
  interventionEventsService: InterventionEventsService,
): Promise<APIGatewayProxyResult> {
  const historyService = new HistoryService(accountStatusService, interventionEventsService);

  const history = await historyService.fetchHistory(userId);

  return {
    statusCode: 200,
    body: JSON.stringify(history),
  };
}

/**
 * Function to transform the response from DynamoDB into an object.
 * @param item - Response from DynamoDB
 * @returns - An object with all the required fields for the handler response. Creates a default object if any fields are undefined.
 * Updates timestamps to now if they are returned as null.
 */
function transformResponseFromDynamoDatabase(item: Partial<AccountStatus>): V1Response {
  const currentTimestampMs = getCurrentTimestamp().milliseconds;
  return {
    intervention: {
      updatedAt: item.updatedAt ?? currentTimestampMs,
      appliedAt: item.appliedAt ?? currentTimestampMs,
      sentAt: item.sentAt ?? currentTimestampMs,
      description: (item.intervention as AISInterventionTypes | undefined) ?? AISInterventionTypes.AIS_NO_INTERVENTION,
      reprovedIdentityAt: item.reprovedIdentityAt,
      resetPasswordAt: item.resetPasswordAt,
      accountDeletedAt: item.deletedAt,
    },
    state: {
      blocked: item.blocked ?? false,
      suspended: item.suspended ?? false,
      resetPassword: item.resetPassword ?? false,
      reproveIdentity: item.reproveIdentity ?? false,
    },
    auditLevel: item.auditLevel ?? 'standard',
  };
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
