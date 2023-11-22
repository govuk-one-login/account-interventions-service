import type { Context, APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AppConfigService } from '../services/app-config-service';
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import { MetricNames, AISInterventionTypes, undefinedResponseFromDynamoDatabase } from '../data-types/constants';
import { AccountStatus } from '../data-types/interfaces';
import { DynamoDatabaseService } from '../services/dynamo-database-service';
import { transitionConfiguration } from '../services/account-states/config';

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
      accountStatus.history = createHistoryObject(response['history']);
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
  item: Record<string, string | number | boolean | History[]>,
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
      const split = elements.split('|');
      output.push(split);
    }
    if (elements.split('|').length !== 7) {
      logger.warn('The history event received is malformed.');
      logAndPublishMetric(MetricNames.INVALID_HISTORY_STRING);
    }
  }
  return output;
}

function createHistoryObject(input: string[]) {
  const historyArray = removePipeFromHistoryString(input);
  const output = [];
  console.log(historyArray);
  for (let i = 0; i <= historyArray.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    for (let index = 0; index <= historyArray[i]?.length!; index++) {
      const historyObj = {
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        sentAt: String(convertStringToIsoString(historyArray[i]?.[index++]!)),
        component: String(historyArray[i]?.[index++]),
        code: String(historyArray[i]?.[index++]),
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        intervention: String(transitionConfiguration.edges[Number.parseInt(historyArray[i]?.[index]!)]?.name),
        reason: String(historyArray[i]?.[index++]),
        originatingComponent: String(historyArray[i]?.[index++] ?? ''),
        originatorReferenceId: String(historyArray[i]?.[index++] ?? ''),
        requesterId: String(historyArray[i]?.[index++] ?? ''),
      };
      output.push(historyObj);
    }
  }
  return output;
}

const example = [
  '1609462861000|TICF_CRI|01|01|CMS|1234567|1234567',
  '1609462861000|somecode|02|02|string|12345675|194859670485',
  '1609462861000|TICF_CRI|01|01|CMS||',
];

console.log(createHistoryObject(example));

function convertStringToIsoString(input: string) {
  return new Date(Number.parseInt(input)).toISOString();
}
//console.log(createHistoryObject(['1609462861000|TICF_CRI|01|01|CMS|1234567|1234567']));

// console.log(removePipeFromHistoryString(example));
