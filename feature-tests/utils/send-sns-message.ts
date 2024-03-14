import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import EndPoints from '../apiEndpoints/endpoints';

export async function sendSNSDeleteMessage(key: string, testUserId: string) {
  const snsClient = new SNSClient({ region: 'eu-west-2' });
  const message = JSON.stringify({ [key]: testUserId });
  const topicArn = EndPoints.SNS_DELETE_ACCOUNT_TOPIC_ARN;
  console.log('message' + message);

  const response = await snsClient.send(
    new PublishCommand({
      Message: message,
      TopicArn: topicArn,
    }),
  );
  console.log(response);
  return response;
}
