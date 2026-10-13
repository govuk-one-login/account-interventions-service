import logger from '../commons/logger.mts';
import * as Ajv2019Module from 'ajv/dist/2019.js';
import { LOGS_PREFIX_SENSITIVE_INFO, MetricNames } from '../data-types/constants.ts';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { addMetric, metric } from '../commons/metrics.mts';
import { accountDeleteMessageSchema } from '../contracts/account-delete-message.mts';
import { prettifyError } from 'zod';
import jsonSafeParse from '../commons/json-safe-parse.mts';
import { AUTH_DELETE_ACCOUNTSchema } from '@govuk-one-login/event-catalogue-schemas';
import { addEventMetadataToSchema } from '../commons/compile-schema.mts';
import { AccountStatusService } from '../tables/account-status.mts';

interface AjvValidateFunction {
  (data: unknown): boolean;
  errors?: unknown;
}

interface AjvInstance {
  compile(schema: object): AjvValidateFunction;
}

// ajv's Ajv2019 default export isn't typed as constructable under NodeNext
// module resolution (a known TypeScript limitation with CJS default exports
// — see github.com/microsoft/TypeScript/issues/49189 and #52086). The
// constructor is asserted to a minimal local interface covering only the
// methods this file actually uses, rather than fighting ajv's own types.
const Ajv2019 = Ajv2019Module.default as unknown as new (opts?: { allErrors?: boolean }) => AjvInstance;

const ajv2019 = new Ajv2019({ allErrors: true });

const validateEventCatalogue = ajv2019.compile(
  addEventMetadataToSchema(AUTH_DELETE_ACCOUNTSchema, 'AUTH_DELETE_ACCOUNT'),
);

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
  ) {
    super(message ?? 'The SQS message can not be parsed.');
    this.name = 'ParserError';
  }
}

export async function processAccountDeletion(
  event: SQSEvent,
  accountStatusService: AccountStatusService
): Promise<void> {
  if (!event.Records[0]) {
    logger.error('The event does not contain any records.');
    return;
  }

  const updateRecordsByIdPromises = event.Records.map((record) => {
    const userId = getUserId(record);
    return userId ? updateDeleteStatusId(userId, accountStatusService) : undefined;
  }).filter((prom) => prom !== undefined);
  await Promise.all(updateRecordsByIdPromises);
  metric.publishStoredMetrics();
}

/**
 * Function to parse the JSON message from the SQS Record.
 * @param record - The record passed in from the event.
 * @returns - User ID or undefined
 */
function parseMessage(record: SQSRecord): string {
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

  if (!validateEventCatalogue(recordBodyResult.data)) {
    logger.info(`${LOGS_PREFIX_SENSITIVE_INFO} Event has failed event catalogue schema validation.`, {
      validationErrors: validateEventCatalogue.errors,
    });
    addMetric(MetricNames.INVALID_EVENT_RECEIVED_EVENT_CATALOGUE, undefined, undefined, {
      EVENT_NAME: result.data.event_name,
    });
  }

  return result.data.user.user_id;
}

/**
 * Function to take the User ID from the SQS Record.
 * @param record - The record passed in from the event.
 * @returns - User ID as a string, with whitespace removed.
 */
function getUserId(record: SQSRecord) {
  try {
    return parseMessage(record);
  } catch (error) {
    if (error instanceof ParserError) {
      logger.error(error.message);
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
async function updateDeleteStatusId(userId: string, accountStatusService: AccountStatusService) {
  try {
    await accountStatusService.updateDeleteStatus(userId);
  } catch (error) {
    logger.error(`${LOGS_PREFIX_SENSITIVE_INFO} Error updating account ${userId}`, { error });
    addMetric(MetricNames.MARK_AS_DELETED_FAILED);
    metric.publishStoredMetrics();
    throw new Error('Failed to update the account status.', { cause: error });
  }
}
