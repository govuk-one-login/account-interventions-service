import {
  DeleteMessageBatchCommand,
  PurgeQueueCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { aisEvents } from './ais-events';
import EndPoints from '../apiEndpoints/endpoints';
import { CurrentTimeDescriptor, timeDelayForTestEnvironment, attemptParseJSON } from '../utils/utility';

const client = new SQSClient({ apiVersion: '2012-11-05', region: process.env.AWS_REGION });
export async function sendSQSEvent(testUserId: string, aisEventType: keyof typeof aisEvents) {
  const currentTime = getCurrentTimestamp();

  const queueURL = EndPoints.SQS_QUEUE_URL;
  const event = { ...aisEvents[aisEventType] };
  event.user.user_id = testUserId;
  event.event_timestamp_ms = currentTime.milliseconds;
  event.timestamp = currentTime.seconds;
  const messageBody = JSON.stringify(event);

  try {
    await client.send(
      new SendMessageCommand({
        MessageBody: messageBody,
        QueueUrl: queueURL,
      }),
    );
    //console.log('Success, messageId is', data.MessageId);
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
  const queueURL = EndPoints.SQS_EGRESS_QUEUE_URL;

  try {
    await client.send(
      new PurgeQueueCommand({
        QueueUrl: queueURL,
      }),
    );
    await timeDelayForTestEnvironment(1000);
    console.log('Purge Success');
  } catch (error) {
    console.log('Error', error);
  }
}

export async function receiveMessagesFromEgressQueue() {
  let response;
  const queueURL = EndPoints.SQS_EGRESS_QUEUE_URL;
  const messages = [];

  let count = 0;
  do {
    try {
      response = await client.send(
        new ReceiveMessageCommand({
          MaxNumberOfMessages: 10,
          QueueUrl: queueURL,
        }),
      );

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
  } while ((response?.Messages && response.Messages.length > 0) || messages.length === 0);

  if (messages.length > 0) {
    await client.send(
      new DeleteMessageBatchCommand({
        QueueUrl: queueURL,
        Entries: messages.map((message) => ({
          Id: message.MessageId,
          ReceiptHandle: message.ReceiptHandle,
        })),
      }),
    );
  }
  console.log(`Got ${messages.length} messages returned and deleted from SQS ${queueURL}`);
  return messages;
}

export async function filterUserIdInMessages(testUserId: string) {
  const messages = await receiveMessagesFromEgressQueue();
  const filteredMessageByUserId = messages.filter((message) => {
    const messageBody = message.Body ? attemptParseJSON(message.Body) : {};
    return messageBody.user.user_id === testUserId;
  });
  console.log(
    `Filtered ${filteredMessageByUserId.length} messages with UserID = ${testUserId} from ${messages.length} messages`,
  );
  return filteredMessageByUserId;
}
