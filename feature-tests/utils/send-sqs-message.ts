import { SQS } from '@aws-sdk/client-sqs';
import { aisEvents } from './ais-events';
import EndPoints from '../apiEndpoints/endpoints';
import { getCurrentTimestamp } from '../../src/commons/get-current-timestamp';

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
