import { SQS } from '@aws-sdk/client-sqs';
import { aisEvents } from './ais-events';
import EndPoints from '../apiEndpoints/endpoints';
import { CurrentTimeDescriptor } from '../utils/utility';

export async function sendSQSEvent(testUserId: string, aisEventType: keyof typeof aisEvents) {
  const currentTime = getCurrentTimestamp();
  const sqs = new SQS({ apiVersion: '2012-11-05', region: process.env.AWS_REGION });
  const queueURL = EndPoints.SQS_QUEUE_URL;
  const event = { ...aisEvents[aisEventType] };
  event.user.user_id = testUserId;
  event.event_timestamp_ms = currentTime.milliseconds;
  event.timestamp = currentTime.seconds;
  const messageBody = JSON.stringify(event);
  const parameters = {
    MessageBody: messageBody,
    QueueUrl: queueURL,
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

export async function purgeEgressOueue() {
  const sqs = new SQS({ apiVersion: '2012-11-05', region: process.env.AWS_REGION });
  const queueURL = EndPoints.SQS_EGRESS_QUEUE_URL;
  const parameters = {
    QueueUrl: queueURL,
  };
  try {
    await sqs.purgeQueue(parameters);
    console.log('Purge Success');
  } catch (error) {
    console.log('Error', error);
  }
}

export async function receiveMessagesFromEgressOueue() {
  const sqs = new SQS({ apiVersion: '2012-11-05', region: process.env.AWS_REGION });
  let data;
  const queueURL = EndPoints.SQS_EGRESS_QUEUE_URL;
  const parameters = {
    QueueUrl: queueURL,
};
  try {
    data = (await sqs.receiveMessage(parameters)).Messages;
  } catch (error) {
    console.log('Error', error);
  }
  console.log('data message', data);
  return data;
}


