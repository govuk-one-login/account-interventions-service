import { Context, SQSBatchItemFailure, SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';
import logger from '../commons/logger';
import {
  EventsEnum,
  LOGS_PREFIX_SENSITIVE_INFO,
  MetricNames,
  noMetadata,
  TICF_ACCOUNT_INTERVENTION,
} from '../data-types/constants';
import { logAndPublishMetric } from '../commons/metrics';
import { validateEvent, validateInterventionEvent } from '../services/validate-event';
import { AccountStateEngine } from '../services/account-states/account-state-engine';
import { DynamoDatabaseService } from '../services/dynamo-database-service';
import { AppConfigService } from '../services/app-config-service';
import { StateTransitionError, TooManyRecordsError, ValidationError } from '../data-types/errors';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { DynamoDBStateResult, StateDetails, TxMAIngressEvent } from '../data-types/interfaces';
import { buildPartialUpdateAccountStateCommand } from '../commons/build-partial-update-state-command';
import { sendAuditEvent } from '../services/send-audit-events';
import { updateAccountStateCountMetric } from '../commons/update-account-state-metrics';

const appConfig = AppConfigService.getInstance();
const service = new DynamoDatabaseService(appConfig.tableName);
const accountStateEngine = AccountStateEngine.getInstance();
/**
 * A function for receiving and processing an intervention event.
 *
 * @param event - SQS event
 * @param context - the {@link Context} object containing information about the runtime environment of this Lambda function
 */
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
  for (const record of event.Records) {
    await processSQSRecord(itemFailures, record);
  }
  logger.debug('returning items that failed processing: ' + JSON.stringify(itemFailures));
  return {
    batchItemFailures: itemFailures,
  };
};

/**
 * A function to process the SQS record, retrieve the corresponding record from DynamoDB and update the record accordingly.
 *
 * @param itemFailures - the array of items that should be retried
 * @param record - sqs record
 */
async function processSQSRecord(itemFailures: SQSBatchItemFailure[], record: SQSRecord) {
  const currentTimestamp = getCurrentTimestamp();
  try {
    const recordBody: TxMAIngressEvent = JSON.parse(record.body);
    validateEvent(recordBody);
    const intervention = getInterventionName(recordBody);
    logger.debug(`${LOGS_PREFIX_SENSITIVE_INFO} Intervention received.`, { intervention });

    if (intervention === EventsEnum.IPV_IDENTITY_ISSUED && recordBody.extensions?.levelOfConfidence !== 'P2') {
      logger.warn(`Received interventions has low level of confidence: ${recordBody.extensions?.levelOfConfidence}`);
      logAndPublishMetric(MetricNames.CONFIDENCE_LEVEL_TOO_LOW);
      return;
    }

    const userId = recordBody.user.user_id;
    const eventTimestampInMs = recordBody.event_timestamp_ms ?? recordBody.timestamp * 1000;

    if (isTimestampInFuture(eventTimestampInMs)) {
      await sendAuditEvent('AIS_INTERVENTION_IGNORED_IN_FUTURE', userId, {
        intervention,
        reason: 'received event is in the future',
        appliedAt: undefined,
      });
      itemFailures.push({
        itemIdentifier: record.messageId,
      });
      return;
    }

    logAndPublishMetric(
      MetricNames.EVENT_DELIVERY_LATENCY,
      noMetadata,
      currentTimestamp.milliseconds - eventTimestampInMs,
    );
    const itemFromDB = await service.getAccountStateInformation(userId);

    if (itemFromDB?.isAccountDeleted === true) {
      logger.warn(`${LOGS_PREFIX_SENSITIVE_INFO} user ${userId} account has been deleted.`);
      logAndPublishMetric(MetricNames.ACCOUNT_IS_MARKED_AS_DELETED);
      await sendAuditEvent('AIS_INTERVENTION_IGNORED_ACCOUNT_DELETED', userId, {
        intervention,
        appliedAt: undefined,
        reason: 'Target user account is marked as deleted.',
      });
      return;
    }

    if (isEventAfterLastEvent(eventTimestampInMs, itemFromDB?.sentAt, itemFromDB?.appliedAt)) {
      logger.debug('retrieved item from DB ' + JSON.stringify(itemFromDB));
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
      return;
    }

    logger.warn('Event received predates last applied event for this user.');
    logAndPublishMetric(MetricNames.INTERVENTION_EVENT_STALE);
    await sendAuditEvent('AIS_INTERVENTION_IGNORED_STALE', userId, {
      intervention,
      appliedAt: undefined,
      reason: 'Received intervention predates latest applied intervention',
    });
    return;
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn('ValidationError caught, message will not be retried.');
    } else if (error instanceof StateTransitionError) {
      logger.warn('StateTransitionError caught, message will not be retried.');
      const userId = (JSON.parse(record.body) as TxMAIngressEvent).user.user_id;
      await sendAuditEvent('AIS_INTERVENTION_TRANSITION_IGNORED', userId, {
        intervention: error.transition,
        appliedAt: undefined,
        reason: error.message,
      });
    } else if (error instanceof TooManyRecordsError) {
      logger.warn('TooManyRecordsError caught, message will not be retried.');
    } else {
      logger.debug(JSON.stringify(error));
      itemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }
}

/**
 * A function to check if timestamp of the event is in the future.
 *
 * @param recordTimeStampInMs - timestamp in ms from record
 */
function isTimestampInFuture(recordTimeStampInMs: number): boolean {
  const now = getCurrentTimestamp().milliseconds;
  if (now < recordTimeStampInMs) {
    logger.debug(`Timestamp is in the future (sec): ${recordTimeStampInMs}.`);
    logAndPublishMetric(MetricNames.INTERVENTION_IGNORED_IN_FUTURE);
    return true;
  }
  return false;
}

/**
 * A function to compute the event name,
 *
 * @param recordBody - the parsed body of the sqs record
 */
function getInterventionName(recordBody: TxMAIngressEvent): EventsEnum {
  logger.debug('event is valid, starting processing');
  if (recordBody.event_name === TICF_ACCOUNT_INTERVENTION) {
    validateInterventionEvent(recordBody);
    const interventionCode = Number.parseInt(recordBody.extensions!.intervention!.intervention_code);
    return accountStateEngine.getInterventionEnumFromCode(interventionCode);
  }
  return recordBody.event_name as EventsEnum;
}

/**
 * Function to ascertain that the event timestamp is after the latest intervention applied on the account.
 * @param eventTimeStamp - Event timestamp received from the SQS Record.
 * @param sentAt - Sent At field recieved from the DynamoDB table.
 * @param appliedAt - Applied At field recieved from the DynamoDB table.
 * @returns - Boolean logic, true if the time stamp is greater than the latest intervention. False, if it is not.
 */
function isEventAfterLastEvent(eventTimeStamp: number, sentAt?: number, appliedAt?: number) {
  const latestIntervention = sentAt ?? appliedAt ?? 0;
  return eventTimeStamp > latestIntervention;
}

function formCurrentAccountStateObject(itemFromDB?: DynamoDBStateResult) {
  return {
    blocked: itemFromDB ? itemFromDB.blocked : false,
    suspended: itemFromDB ? itemFromDB.suspended : false,
    resetPassword: itemFromDB ? itemFromDB.resetPassword : false,
    reproveIdentity: itemFromDB ? itemFromDB.reproveIdentity : false,
  };
}
