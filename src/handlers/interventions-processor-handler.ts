import { Context, SQSBatchItemFailure, SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import {
  EventsEnum,
  LOGS_PREFIX_SENSITIVE_INFO,
  MetricNames,
  noMetadata,
  TICF_ACCOUNT_INTERVENTION,
} from '../data-types/constants';
import { DynamoDBStateResult, StateDetails, TxMAIngressEvent } from '../data-types/interfaces';
import { StateTransitionError, TooManyRecordsError, ValidationError } from '../data-types/errors';
import {
  validateEventAgainstSchema,
  validateEventIsNotInFuture,
  validateEventIsNotStale,
  validateInterventionEvent,
  validateLevelOfConfidence,
} from '../services/validate-event';
import { AppConfigService } from '../services/app-config-service';
import { DynamoDatabaseService } from '../services/dynamo-database-service';
import { AccountStateEngine } from '../services/account-states/account-state-engine';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { sendAuditEvent } from '../services/send-audit-events';
import { buildPartialUpdateAccountStateCommand } from '../commons/build-partial-update-state-command';
import { updateAccountStateCountMetric } from '../commons/update-account-state-metrics';

const appConfig = AppConfigService.getInstance();
const service = new DynamoDatabaseService(appConfig.tableName);
const accountStateEngine = AccountStateEngine.getInstance();
export const handler = async (event: SQSEvent, context: Context): Promise<SQSBatchResponse> => {
  logger.addContext(context);

  if (event.Records.length === 0) {
    logger.warn('Received no records.');
    logAndPublishMetric(MetricNames.INTERVENTION_EVENT_INVALID);
    return {
      batchItemFailures: [],
    };
  }

  const itemFailures: SQSBatchItemFailure[] = [];
  const promiseArray = event.Records.map((record: SQSRecord) => {
    return processSQSRecord(record).catch(async (error) => {
      const itemIdentifier = await handleError(error, record);
      if (itemIdentifier) itemFailures.push({ itemIdentifier });
    });
  });
  await Promise.allSettled(promiseArray);
  logger.debug('returning items that failed processing: ' + JSON.stringify(itemFailures));
  return {
    batchItemFailures: itemFailures,
  };
};

async function handleError(error: unknown, record: SQSRecord) {
  if (error instanceof ValidationError)
    logger.warn('ValidationError caught, message will not be retried.', { errorMessage: error.message });
  else if (error instanceof TooManyRecordsError)
    logger.warn('Too many records were returned from the database. Message will not be retried', {
      errorMessage: error.message,
    });
  else if (error instanceof StateTransitionError) {
    logger.warn('StateTransitionError caught, message will not be retried.', { errorMessage: error.message });
    const userId = (JSON.parse(record.body) as TxMAIngressEvent).user.user_id;
    await sendAuditEvent('AIS_INTERVENTION_TRANSITION_IGNORED', userId, {
      intervention: error.transition,
      appliedAt: undefined,
      reason: error.message,
    });
  } else {
    logger.error('Error caught, message will be retried.', { errorMessage: (error as Error).message });
    return record.messageId;
  }
}

async function processSQSRecord(record: SQSRecord) {
  const currentTimestamp = getCurrentTimestamp();
  const recordBody: TxMAIngressEvent = JSON.parse(record.body);
  validateEventAgainstSchema(recordBody);
  const intervention = getInterventionName(recordBody);
  logger.debug(`${LOGS_PREFIX_SENSITIVE_INFO} Intervention received.`, { intervention });
  validateLevelOfConfidence(intervention, recordBody);
  await validateEventIsNotInFuture(intervention, recordBody);

  const userId = recordBody.user.user_id;
  const eventTimestampInMs = recordBody.event_timestamp_ms ?? recordBody.timestamp * 1000;

  logAndPublishMetric(
    MetricNames.EVENT_DELIVERY_LATENCY,
    noMetadata,
    currentTimestamp.milliseconds - eventTimestampInMs,
  );

  const itemFromDB = await service.getAccountStateInformation(userId);

  await validateAccountIsNotDeleted(intervention, userId, itemFromDB);

  await validateEventIsNotStale(intervention, recordBody, itemFromDB);

  const currentAccountState: StateDetails = formCurrentAccountStateObject(itemFromDB);
  const statusResult = accountStateEngine.applyEventTransition(intervention, currentAccountState);
  const partialCommandInput = buildPartialUpdateAccountStateCommand(
    statusResult.newState,
    intervention,
    currentTimestamp.milliseconds,
    recordBody,
    statusResult.interventionName,
  );
  logger.debug('processed requested event, sending update request to dynamo db');
  await service.updateUserStatus(userId, partialCommandInput);
  updateAccountStateCountMetric(currentAccountState, statusResult.newState);
  logAndPublishMetric(MetricNames.INTERVENTION_EVENT_APPLIED, [], 1, { eventName: intervention.toString() });
  await sendAuditEvent('AIS_INTERVENTION_TRANSITION_APPLIED', userId, {
    intervention,
    appliedAt: currentTimestamp.milliseconds,
    reason: undefined,
  });
}

function getInterventionName(recordBody: TxMAIngressEvent): EventsEnum {
  logger.debug('event is valid, starting processing');
  if (recordBody.event_name === TICF_ACCOUNT_INTERVENTION) {
    validateInterventionEvent(recordBody);
    const interventionCode = Number.parseInt(recordBody.extensions!.intervention!.intervention_code);
    return accountStateEngine.getInterventionEnumFromCode(interventionCode);
  }
  return recordBody.event_name as EventsEnum;
}

async function validateAccountIsNotDeleted(intervention: EventsEnum, userId: string, itemFromDB?: DynamoDBStateResult) {
  if (itemFromDB?.isAccountDeleted === true) {
    logger.warn(`${LOGS_PREFIX_SENSITIVE_INFO} user ${userId} account has been deleted.`);
    logAndPublishMetric(MetricNames.ACCOUNT_IS_MARKED_AS_DELETED);
    await sendAuditEvent('AIS_INTERVENTION_IGNORED_ACCOUNT_DELETED', userId, {
      intervention,
      appliedAt: undefined,
      reason: 'Target user account is marked as deleted.',
    });
    throw new ValidationError('Account is marked as deleted.');
  }
}

function formCurrentAccountStateObject(itemFromDB?: DynamoDBStateResult) {
  return {
    blocked: itemFromDB ? itemFromDB.blocked : false,
    suspended: itemFromDB ? itemFromDB.suspended : false,
    resetPassword: itemFromDB ? itemFromDB.resetPassword : false,
    reproveIdentity: itemFromDB ? itemFromDB.reproveIdentity : false,
  };
}
