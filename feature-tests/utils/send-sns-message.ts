import { fromSSO } from '@aws-sdk/credential-providers';
import { SQS } from '@aws-sdk/client-sqs';

export async function sendSQSEvent(testUserId:string) {

  const credentials = await fromSSO({
    profile: process.env['AWS_PROFILE'] ?? 'dev-admin'
  })();

  const sqs = new SQS({ apiVersion: '2012-11-05', credentials, region: 'eu-west-2' });
  const queueURL = 'https://sqs.eu-west-2.amazonaws.com/013758878511/account-interventions-service-PersistDataQueue';
  const messageBody =  JSON.stringify({ userId: testUserId });

  const params = {
    MessageBody: messageBody,
    QueueUrl: queueURL
  };

  try {
    const data = await sqs.sendMessage(params);
    console.log('Success, messageId is', data.MessageId);
  } catch (err) {
    console.log('Error', err);
  }
}

 
  


