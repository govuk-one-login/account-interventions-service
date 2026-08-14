import { SQS } from '@aws-sdk/client-sqs';
import { aisEvents } from './ais-events';
import { CurrentTimeDescriptor } from './time-utils';

export async function sendSQSEvent(sqs: SQS, queueUrl: string | undefined, testUserId: string, aisEventType: keyof typeof aisEvents) {
  const currentTime = getCurrentTimestamp();
  const event = { ...aisEvents[aisEventType] };
  event.user.user_id = testUserId;
  event.event_timestamp_ms = currentTime.milliseconds;
  event.timestamp = currentTime.seconds;
  const messageBody = JSON.stringify(event);
  const parameters = {
    MessageBody: messageBody,
    QueueUrl: queueUrl,
  };

  try {
    const data = await sqs.sendMessage(parameters);
    console.log('Success, messageId is', data.MessageId);
  } catch (error) {
    console.log('Error', error);
  }
}

function getCurrentTimestamp(date = new Date()): CurrentTimeDescriptor {
  return {
    milliseconds: date.valueOf(),
    isoString: date.toISOString(),
    seconds: Math.floor(date.valueOf() / 1000),
  };
}
