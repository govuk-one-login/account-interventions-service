import { parseArgs } from 'node:util';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';

enum EventType {
  TICF_ACCOUNT_INTERVENTION = 'TICF_ACCOUNT_INTERVENTION',
  AUTH_PASSWORD_RESET_SUCCESSFUL = 'AUTH_PASSWORD_RESET_SUCCESSFUL', //pragma: allowlist secret
  IPV_ACCOUNT_INTERVENTION_END = 'IPV_ACCOUNT_INTERVENTION_END',
}

enum InterventionCode {
  CODE_01 = '01',
  CODE_02 = '02',
  CODE_03 = '03',
  CODE_04 = '04',
  CODE_05 = '05',
  CODE_06 = '06',
  CODE_07 = '07',
}

const isValidInterventionCode = (value: string | undefined): value is InterventionCode =>
  Object.values(InterventionCode).includes(value as InterventionCode);

function getEventByName(eventName: EventType, userId: string, interventionCode: InterventionCode) {
  const currentTime = getCurrentTimestamp();
  const timestamps = {
    timestamp: currentTime.seconds,
    event_timestamp_ms: currentTime.milliseconds,
  };

  if (eventName === EventType.TICF_ACCOUNT_INTERVENTION)
    return {
      component_id: 'TEST_EATL',
      event_name: 'TICF_ACCOUNT_INTERVENTION',
      event_id: '123',
      user: {
        user_id: userId,
      },
      extensions: {
        intervention: {
          intervention_code: interventionCode,
          intervention_reason: '03',
          originating_component_id: 'TEST_EATL',
          originator_reference_id: [],
          requester_id: 'edward.louth@digital.cabinet-office.gov.uk',
        },
      },
      ...timestamps,
    };

  if (eventName === EventType.AUTH_PASSWORD_RESET_SUCCESSFUL)
    return {
      event_name: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
      event_id: '123',
      client_id: 'UNKNOWN',
      component_id: 'UNKNOWN',
      user: {
        user_id: userId,
      },
      ...timestamps,
    };

  return {
    component_id: 'UNKNOWN',
    event_id: '123',

    event_name: 'IPV_ACCOUNT_INTERVENTION_END',
    user: {
      user_id: userId,
    },
    extensions: {
      type: 'reprove_identity',
      success: true,
    },
    ...timestamps,
  };
}

async function sendAuditEvent(
  queueUrl: string,
  userId: string,
  eventName: EventType,
  interventionCode: InterventionCode,
) {
  const client = new SQSClient();

  const event = getEventByName(eventName, userId, interventionCode);

  const response = await client.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(event),
    }),
  );
  console.log('Message sent:', response.MessageId);
}

const { values } = parseArgs({
  options: {
    queueUrl: { type: 'string' },
    userId: { type: 'string' },
    eventName: { type: 'string' },
    interventionCode: { type: 'string' },
  },
});

const isValidEvent = (value: string | undefined): value is EventType =>
  Object.values(EventType).includes(value as EventType);

// eslint-disable-next-line unicorn/prefer-top-level-await
void (async () => {
  const queueUrl = values.queueUrl ?? 'https://sqs.eu-west-2.amazonaws.com/484907510598/ais-main-TxMAIngressQueue';
  const userId = values.userId ?? 'urn:fdc:gov.uk:2022:pgt1qOf7zW2tMCZg4V5LEu-mT-_GTSX7xqJ6RJekw9I';
  const eventName = values.eventName ?? 'TICF_ACCOUNT_INTERVENTION';
  const interventionCode = values.interventionCode ?? '01';

  if (!isValidEvent(eventName)) {
    throw new Error(`--eventName must be one of: ${Object.values(EventType).join(', ')}`);
  }

  if (!isValidInterventionCode(interventionCode)) {
    throw new Error(`--interventionCode must be one of: ${Object.values(InterventionCode).join(', ')}`);
  }

  await sendAuditEvent(queueUrl, userId, eventName, interventionCode);
})();
