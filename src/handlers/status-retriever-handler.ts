import type { Context, APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AppConfigService } from '../services/app-config-service';
import logger from '../commons/logger';
import { addMetric, metric } from '../commons/metrics';
import { MetricNames, AISInterventionTypes } from '../data-types/constants';
import { FullAccountInformation, HistoryObject } from '../data-types/interfaces';
import { DynamoDatabaseService } from '../services/dynamo-database-service';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { HistoryStringBuilder } from '../commons/history-string-builder';
import getActiveInterventions from '../services/active-interventions-service';
import { getPersistentInterventionEventsService, InterventionEventsService } from '../tables/intervention-events';
import { UserIdParameterSchema, V1QuerySchema } from '../data-types/api-parameters';
import { V1Response } from '../data-types/api-schemas-v1';

const appConfig = AppConfigService.getInstance();
const dynamoDatabaseServiceInstance = new DynamoDatabaseService(appConfig.tableName);

/**
 * Status Retriever Handler. Queries DynamoDB and returns the intervention status of the account.
 * @param event - Event passed in from API Gateway.
 * @param context - This object provides methods and properties that provide information about the invocation, function, and execution environment.
 * @returns - The status of the account when matched with the User ID. Returns a default object if unable to do so. Also returns the relevant status code.
 */
export async function handle(
  event: APIGatewayEvent,
  context: Context,
  interventionEventsService: InterventionEventsService = getPersistentInterventionEventsService(),
): Promise<APIGatewayProxyResult> {
  logger.addContext(context);

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
    if (event.resource === '/v2/ais/{userId}') return await v2StatusApiHandler(userId, interventionEventsService);

    const { history: historyQuery } = V1QuerySchema.parse(event.queryStringParameters ?? {});

    return await v1StatusApiHandler(userId, historyQuery);
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

async function v1StatusApiHandler(userId: string, historyQuery: boolean | undefined) {
  const response = await dynamoDatabaseServiceInstance.getFullAccountInformation(userId);
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

async function v2StatusApiHandler(userId: string, interventionEventsService: InterventionEventsService) {
  logger.debug('v2 endpoint');

  const response = await dynamoDatabaseServiceInstance.getAccountStateInformation(userId);
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

/**
 * Function to transform the response from DynamoDB into an object.
 * @param item - Response from DynamoDB
 * @returns - An object with all the required fields for the handler response. Creates a default object if any fields are undefined.
 * Updates timestamps to now if they are returned as null.
 */
function transformResponseFromDynamoDatabase(item: Partial<FullAccountInformation>): V1Response {
  const currentTimestampMs = getCurrentTimestamp().milliseconds;
  return {
    intervention: {
      updatedAt: item.updatedAt ?? currentTimestampMs,
      appliedAt: item.appliedAt ?? currentTimestampMs,
      sentAt: item.sentAt ?? currentTimestampMs,
      description: (item.intervention as AISInterventionTypes | undefined) ?? AISInterventionTypes.AIS_NO_INTERVENTION,
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
    auditLevel: (item.auditLevel as 'standard' | 'enhanced' | undefined) ?? 'standard',
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
