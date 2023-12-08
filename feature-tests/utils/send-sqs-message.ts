import { SQS } from '@aws-sdk/client-sqs';
import { aisEvents } from './ais-events-array';
import EndPoints from '../apiEndpoints/endpoints';

export async function sendSQSEvent(testUserId: string, aisEventType: keyof typeof aisEvents) {
  const sqs = new SQS({ apiVersion: '2012-11-05', region: process.env.AWS_REGION });
  const queueURL = EndPoints.SQS_QUEUE_URL;
  aisEvents[aisEventType][0]!.user.user_id = testUserId;
  const messageBody = JSON.stringify(aisEvents[aisEventType][0]);

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
