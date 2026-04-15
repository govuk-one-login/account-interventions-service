import { SQSEvent, Context } from "aws-lambda";
import { StubSqsClient } from "../../src/services/stub-service/sqs-queue-client";

export function stubTriggers(client: StubSqsClient, triggers: Record<string, (event: SQSEvent, context: Context) => Promise<any>> ) {
  client.onSend((queueUrl, message) => {
    const lambdaHandler = triggers[queueUrl];
    if (!lambdaHandler) return;
    const mockContext = {} as Context;

    //this may need altering ? ?? ? ? ?
    const event: SQSEvent = {
      Records: [{
        messageId: message.messageId,
        body: message.body,
        receiptHandle: '',
        attributes: {} as any,
        messageAttributes: {},
        md5OfBody: '',
        eventSource: 'aws:sqs',
        eventSourceARN: '',
        awsRegion: 'eu-west-1',
      }],
    };

    lambdaHandler(event, mockContext);
  })
}