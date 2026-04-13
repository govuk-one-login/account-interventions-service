import { QueueClient, SQSQueueClient, StubSqsClient } from "./sqs-queue-client";

let stubInstance: StubSqsClient | undefined;

export function getSqsClient(): QueueClient {
  if (process.env['AWS_STUB']) {
    stubInstance ??= new StubSqsClient();
    return stubInstance;
  } else {
    return new SQSQueueClient();
  }
  // return process.env['AWS_STUB'] ?  new StubSqsClient() : new SQSQueueClient();
}

export function getStubSqsClient(): StubSqsClient {
  if (!stubInstance) throw new Error('Stub not initialised — ensure AWS_STUB is set and getSqsClient() has been called');
  return stubInstance;
}

export function resetStubSqsClient(): void {
  if (stubInstance) {
    console.log('resetting stub')
    stubInstance.reset();
  }
}
