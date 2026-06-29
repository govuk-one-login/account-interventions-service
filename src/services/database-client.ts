import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import tracer from '../commons/tracer';
import { AppConfigService } from './app-config-service';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export { DynamoDBClient as DbClient } from '@aws-sdk/client-dynamodb';

let databaseClient: DynamoDBClient | undefined;
let databaseDocumentClient: DynamoDBDocumentClient | undefined;

export function getDBClient(): DynamoDBClient {
  // eslint-disable-next-line unicorn/no-top-level-assignment-in-function
  databaseClient ??= tracer.captureAWSv3Client(
    new DynamoDBClient({
      region: AppConfigService.getInstance().awsRegion,
      maxAttempts: 2,
      requestHandler: new NodeHttpHandler({ requestTimeout: 5000 }),
    }),
  );
  return databaseClient;
}

export function getDBDocumentClient(): DynamoDBDocumentClient {
  // eslint-disable-next-line unicorn/no-top-level-assignment-in-function
  databaseDocumentClient ??= DynamoDBDocumentClient.from(getDBClient());

  return databaseDocumentClient;
}
