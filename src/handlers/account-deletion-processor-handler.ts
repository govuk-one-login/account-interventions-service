import logger from '../commons/logger';
import { DynamoDatabaseService } from '../services/dynamo-database-service';
import { LOGS_PREFIX_SENSITIVE_INFO, MetricNames } from '../data-types/constants';
import { AppConfigService } from '../services/app-config-service';
import type { Context, SQSEvent, SQSRecord } from 'aws-lambda';
import { addMetric, metric } from '../commons/metrics';
import { accountDeleteMessageSchema } from '../contracts/account-delete-message';
import { prettifyError } from 'zod';
import jsonSafeParse from '../commons/json-safe-parse';

enum ErrorSeverity {
  error = 'error',
  warn = 'warn',
}

enum ParserErrorType {
  BODY_JSON_PARSER_ERROR = 'BODY_JSON_PARSER_ERROR',
  BODY_FORMAT_PARSER_ERROR = 'BODY_FORMAT_PARSER_ERROR',
  MISSING_USER_ID = 'MISSING_USER_ID',
  EMPTY_USER_ID = 'EMPTY_USER_ID',
}

class ParserError extends Error {
  constructor(
    public readonly errorType: ParserErrorType,
    message?: string,
    public readonly severity: ErrorSeverity = ErrorSeverity.error,
  ) {
    super(message ?? 'The SQS message can not be parsed.');
    this.name = 'ParserError';
  }
}

const appConfig = AppConfigService.getInstance();
const ddbService = new DynamoDatabaseService(appConfig.tableName);

/**
 * Account deletion processor handler. Updates accounts and marks them for deletion.
 * @param event - SQS event. Consumes these events from a queue and takes the User ID from the record to match the account.
 * @param context -  This object provides methods and properties that provide information about the invocation, function, and execution environment.
 * @returns - Void. Sends off response to DynamoDB.
 */
export async function handler(event: SQSEvent, context: Context): Promise<void> {
  logger.addContext(context);
  if (!event.Records[0]) {
    logger.error('The event does not contain any records.');
    return;
  }

  const updateRecordsByIdPromises = event.Records.map((record) => {
    const userId = getUserId(record);
    return userId ? updateDeleteStatusId(userId) : undefined;
  }).filter((prom) => prom !== undefined);
  await Promise.all(updateRecordsByIdPromises);
  metric.publishStoredMetrics();
}

/**
 * Function to parse the JSON message from the SQS Record.
 * @param record - The record passed in from the event.
 * @returns - User ID or undefined
 */
function parseMessage(record: SQSRecord): string | undefined {
  // JSON parse record.body
  const recordBodyResult = jsonSafeParse(record.body);
  if (!recordBodyResult.success) throw new ParserError(ParserErrorType.BODY_JSON_PARSER_ERROR);

  // Validate against zod schema
  const result = accountDeleteMessageSchema.safeParse(recordBodyResult.data);
  if (!result.success)
    throw new ParserError(
      ParserErrorType.BODY_FORMAT_PARSER_ERROR,
      `The SQS message can not be parsed. ${prettifyError(result.error)}`,
    );

  return result.data.user_id;
}

/**
 * Function to take the User ID from the SQS Record.
 * @param record - The record passed in from the event.
 * @returns - User ID as a string, with whitespace removed.
 */
function getUserId(record: SQSRecord) {
  try {
    const userId = parseMessage(record);

    if (userId === undefined)
      throw new ParserError(ParserErrorType.MISSING_USER_ID, 'Attribute missing: user_id.', ErrorSeverity.warn);
    if (userId.trim() === '')
      throw new ParserError(ParserErrorType.EMPTY_USER_ID, 'Attribute invalid: user_id is empty.', ErrorSeverity.warn);

    return userId.trim();
  } catch (error) {
    if (error instanceof ParserError) {
      logger[error.severity](error.message);
      addMetric(MetricNames.DELETE_EVENT_PARSER_ERROR, undefined, undefined, {
        ERROR: error.errorType,
      });
      metric.publishStoredMetrics();
      return;
    }

    throw error;
  }
}

/**
 * Function to call DynamoDB and mark the account as deleted.
 * @param userId - User ID taken from the record of the SQS Event.
 * @throws - Error if there is a problem updating the account.
 */
async function updateDeleteStatusId(userId: string) {
  try {
    await ddbService.updateDeleteStatus(userId);
  } catch (error) {
    logger.error(`${LOGS_PREFIX_SENSITIVE_INFO} Error updating account ${userId}`, { error });
    addMetric(MetricNames.MARK_AS_DELETED_FAILED);
    metric.publishStoredMetrics();
    throw new Error('Failed to update the account status.', { cause: error });
  }
}
