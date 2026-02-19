import { PurgeQueueCommand, ReceiveMessageCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { aisEvents } from './ais-events';
import EndPoints from '../apiEndpoints/endpoints';
import { attemptParseJSON, CurrentTimeDescriptor, timeDelayForTestEnvironment } from '../utils/utility';
import { invalidAisEvents } from './invalid-ais-events';
import { aisEventsWithEnhancedFields } from './enhanced-ais-events';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

export async function sendSQSEvent(testUserId: string, aisEventType: keyof typeof aisEvents) {
  const currentTime = getCurrentTimestamp();
  const event = { ...aisEvents[aisEventType] };
  event.user.user_id = testUserId;
  event.event_timestamp_ms = currentTime.milliseconds;
  event.timestamp = currentTime.seconds;
  const command = new SendMessageCommand({
    QueueUrl: EndPoints.SQS_QUEUE_URL,
    MessageBody: JSON.stringify(event),
  });

  try {
    const data = await sqsClient.send(command);
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

  const parameters = {
    QueueUrl: EndPoints.SQS_QUEUE_URL,
    MessageBody: JSON.stringify(body),
  };

  try {
    const command = new SendMessageCommand(parameters);
    const data = await sqsClient.send(command);

    console.log('Success, messageId is', data.MessageId);
  } catch (error) {
    console.log('Error', error);
  }
}

export async function sendInvalidSQSEvent(testUserId: string, invalidAisEventTypes: keyof typeof invalidAisEvents) {
  const queueURL = EndPoints.SQS_QUEUE_URL;
  const event = { ...invalidAisEvents[invalidAisEventTypes] };
  event.user.user_id = testUserId;
  const messageBody = JSON.stringify(event);
  const parameters = {
    MessageBody: messageBody,
    QueueUrl: queueURL,
  };

  try {
    const command = new SendMessageCommand(parameters);
    const data = await sqsClient.send(command);
    console.log('Success, messageId is', data.MessageId);
  } catch (error) {
    console.log('Error', error);
  }
}

export async function sendEnhancedSQSEvent(
  testUserId: string,
  enhancedAisEvent: keyof typeof aisEventsWithEnhancedFields,
) {
  const queueURL = EndPoints.SQS_QUEUE_URL;
  const event = { ...aisEventsWithEnhancedFields[enhancedAisEvent] };
  event.user.user_id = testUserId;
  const messageBody = JSON.stringify(event);
  const parameters = {
    MessageBody: messageBody,
    QueueUrl: queueURL,
  };

  try {
    const command = new SendMessageCommand(parameters);
    const data = await sqsClient.send(command);

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
  try {
    await sqsClient.send(new PurgeQueueCommand({ QueueUrl: EndPoints.SQS_EGRESS_QUEUE_URL }));
    await timeDelayForTestEnvironment(5000);
    console.log('Purge Success');
  } catch (error) {
    console.error('Purge Error', error);
  }
}

export async function receiveMessagesFromEgressQueue() {
  let response;
  const messages = [];

  const parameters = {
    QueueUrl: EndPoints.SQS_EGRESS_QUEUE_URL,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 2,
  };
  let count = 0;
  do {
    try {
      response = await sqsClient.send(new ReceiveMessageCommand(parameters));

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

export async function filterUserIdInMessages(testUserId: string, retries = 5) {
  for (let index = 0; index < retries; index++) {
    const messages = await receiveMessagesFromEgressQueue();

    const filtered = messages.filter((message) => {
      const messageBody = message.Body ? attemptParseJSON(message.Body) : {};
      return messageBody.user?.user_id === testUserId;
    });

    if (filtered.length > 0) {
      return filtered;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return [];
}
