import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
let topicArn: any;

export async function sendSNSDeleteMessage(key: string, testUserId: string) {
  const snsClient = new SNSClient({ region: 'eu-west-2' });
  const message = JSON.stringify({ [key]: testUserId });
  console.log('message' + message);

  if (process.env.TEST_ENVIRONMENT === 'dev') {
    topicArn = `arn:aws:sns:eu-west-2:013758878511:${process.env.SAM_STACK_NAME}-AccountDeletionDevTopic`;
  } else if (process.env.TEST_ENVIRONMENT === 'build') {
    topicArn = `arn:aws:sns:eu-west-2:688341086169:${process.env.SAM_STACK_NAME}-AccountDeletionDevTopic`;
  }

  const response = await snsClient.send(
    new PublishCommand({
      Message: message,
      TopicArn: topicArn,
    }),
  );
  console.log(response);
  return response;
}
