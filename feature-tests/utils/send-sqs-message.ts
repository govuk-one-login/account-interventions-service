import { SQS } from '@aws-sdk/client-sqs';
import { aisEvents } from './ais-events';
import EndPoints from '../apiEndpoints/endpoints';
import { CurrentTimeDescriptor, timeDelayForTestEnvironment, attemptParseJSON } from '../utils/utility';
import { invalidAisEvents } from './invalid-ais-events';

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

export async function sendInvalidSQSEvent(testUserId: string, invalidAisEventTypes: keyof typeof invalidAisEvents) {
  const sqs = new SQS({ apiVersion: '2012-11-05', region: process.env.AWS_REGION });
  const queueURL = EndPoints.SQS_QUEUE_URL;
  const event = { ...invalidAisEvents[invalidAisEventTypes] };
  event.user.user_id = testUserId;
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

export async function purgeEgressQueue() {
  const sqs = new SQS({ apiVersion: '2012-11-05', region: process.env.AWS_REGION });
  const queueURL = EndPoints.SQS_EGRESS_QUEUE_URL;
  const parameters = {
    QueueUrl: queueURL,
  };
  try {
    await sqs.purgeQueue(parameters);
    await timeDelayForTestEnvironment(5000);
    console.log('Purge Success');
  } catch (error) {
    console.log('Error', error);
  }
}

export async function receiveMessagesFromEgressQueue() {
  const sqs = new SQS({ apiVersion: '2012-11-05', region: process.env.AWS_REGION });
  let response;
  const queueURL = EndPoints.SQS_EGRESS_QUEUE_URL;
  const messages = [];

  const parameters = {
    QueueUrl: queueURL,
    MaxNumberOfMessages: 10,
  };
  let count = 0;
  do {
    try {
      response = await sqs.receiveMessage(parameters);

      if (response?.Messages) {
        for (const message of response.Messages) {
          messages.push(message);
        }
      }
    } catch (error) {
      console.log('No messages in Queue', error);
    }
    count += 1;
    if (count > 10) break;
  } while (response?.Messages && response.Messages.length > 0);
  return messages;
}

export async function filterUserIdInMessages(testUserId: string) {
  const messages = await receiveMessagesFromEgressQueue();
  console.log('messages', messages);
  const filteredMessageByUserId = messages.filter((message) => {
    const messageBody = message.Body ? attemptParseJSON(message.Body) : {};
    console.log('body', message.Body);
    return messageBody.user.user_id === testUserId;
  });
  return filteredMessageByUserId;
}
