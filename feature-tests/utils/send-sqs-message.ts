import { SQS } from '@aws-sdk/client-sqs';
import { aisEvents } from './ais-events';
import EndPoints from '../apiEndpoints/endpoints';
import { CurrentTimeDescriptor, timeDelayForTestEnvironment, attemptParseJSON } from '../utils/utility';
import { invalidAisEvents } from './invalid-ais-events';
import { aisEventsWithEnhancedFields } from './enhanced-ais-events';

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

export async function sendDeleteEvent(testUserId: string) {
  const body = {
    event_name: 'AUTH_DELETE_ACCOUNT',
    user_id: testUserId,
    txma: { configVersion: '1.0.4' },
  };

  const mockRecord = {
    messageId: '',
    receiptHandle: '',
    body: JSON.stringify(body),
    attributes: {
      ApproximateReceiveCount: '',
      SentTimestamp: '',
      SenderId: '',
      ApproximateFirstReceiveTimestamp: '',
    },
    messageAttributes: {},
    md5OfBody: '',
    eventSource: '',
    eventSourceARN: '',
    awsRegion: '',
  };

  const mockEvent = { Records: [mockRecord] };

  const sqs = new SQS({ apiVersion: '2012-11-05', region: process.env.AWS_REGION });
  const queueURL = EndPoints.SQS_QUEUE_URL;
  const messageBody = JSON.stringify(mockEvent);
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

export async function sendEnhancedSQSEvent(
  testUserId: string,
  enhancedAisEvent: keyof typeof aisEventsWithEnhancedFields,
) {
  const sqs = new SQS({ apiVersion: '2012-11-05', region: process.env.AWS_REGION });
  const queueURL = EndPoints.SQS_QUEUE_URL;
  const event = { ...aisEventsWithEnhancedFields[enhancedAisEvent] };
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
  const filteredMessageByUserId = messages.filter((message) => {
    const messageBody = message.Body ? attemptParseJSON(message.Body) : {};
    return messageBody.user.user_id === testUserId;
  });
  return filteredMessageByUserId;
}
