import type { Context, APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AppConfigService } from '../services/app-config-service';
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import { MetricNames, AISInterventionTypes, undefinedResponseFromDynamoDatabase } from '../data-types/constants';
import { AccountStatus } from '../data-types/interfaces';
import { DynamoDatabaseService } from '../services/dynamo-database-service';

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
      accountStatus.history = response['history'];
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

/**
 * Helper function to transform the data from dynamodb
 * @param item - received from dynamodb
 * @returns transformed object
 */
function transformResponseFromDynamoDatabase(
  item: Record<string, string | number | boolean | object[]>,
): AccountStatus {
  const response: Partial<AccountStatus> = {
    updatedAt: Number(item['updatedAt'] ?? Date.now()),
    appliedAt: Number(item['appliedAt'] ?? Date.now()),
    sentAt: Number(item['sentAt'] ?? Date.now()),
    description: String(item['intervention'] ?? AISInterventionTypes.AIS_NO_INTERVENTION),
    state: {
      blocked: Boolean(item['blocked'] ?? false),
      suspended: Boolean(item['suspended'] ?? false),
      resetPassword: Boolean(item['resetPassword'] ?? false),
      reproveIdentity: Boolean(item['reproveIdentity'] ?? false),
    },
    auditLevel: String(item['auditLevel'] ?? 'standard'),
  };

  if (item['reprovedIdentityAt']) {
    response.reprovedIdentityAt = Number(item['reprovedIdentityAt']);
  }

  if (item['resetPasswordAt']) {
    response.resetPasswordAt = Number(item['resetPasswordAt']);
  }

  return <AccountStatus>response;
}

function removePipeFromHistoryString(input: string[]) {
  const output = [];
  for (const elements of input) {
    if (elements.split('|').length === 7) {
      output.push(...elements.split('|'));
    }
    if (elements.split('|').length !== 7) {
      logger.warn('The history event is possibly malformed.');
      logAndPublishMetric(MetricNames.INVALID_HISTORY_STRING);
    }
  }
  return output;
}

function createHistoryObject(input: string[]) {
  const historyArray = removePipeFromHistoryString(input);
  console.log(historyArray);
  for (let index = 0; index <= 6; index++) {
    const historyObj = {
      sentAt: String(historyArray[0]),
      component: String(historyArray[1]),
      code: String(historyArray[2]),
      reason: String(historyArray[3]),
      originatingComponent: String(historyArray[4]),
      interventionPredecessorId: String(historyArray[5]),
      requesterId: String(historyArray[6]),
    };
    return historyObj;
  }
}
console.log(createHistoryObject);
// const example = [
//   '1609462861000|TICF_CRI|01|01|CMS|1234567|1234567', '18493759573684|somecode|02|02|LOL|12345675|194859670485'
// ]
// console.log(createHistoryObject(example));

//console.log(createHistoryObject(['1609462861000|TICF_CRI|01|01|CMS|1234567|1234567']));

// console.log(removePipeFromHistoryString(example));
