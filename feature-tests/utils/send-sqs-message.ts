import { fromSSO } from '@aws-sdk/credential-providers';
import { SQS } from '@aws-sdk/client-sqs';
import { ais } from './ais-types-array';

export async function sendSQSEvent(testUserId: string, aisType: keyof typeof ais) {
  const credentials = await fromSSO({
    profile: process.env['AWS_PROFILE'] ?? 'dev',
  })();

  const sqs = new SQS({ apiVersion: '2012-11-05', credentials, region: 'eu-west-2' });
  const queueURL = 'https://sqs.eu-west-2.amazonaws.com/013758878511/ais-main-TxMAIngressQueue';
  ais[aisType][0]!.user.user_id = testUserId;
  const messageBody = JSON.stringify(ais[aisType][0]);

  const parameters = {
    MessageBody: messageBody,
    QueueUrl: queueURL,
  };

  try {
    const data = sqs.sendMessage(parameters);
    console.log('Success, messageId is', (await data).MessageId);
  } catch (error) {
    console.log('Error', error);
  }
}
