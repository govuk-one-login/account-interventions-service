import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import tracer from '../commons/tracer';
import { AppConfigService } from './app-config-service';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export { DynamoDBClient as DbClient } from '@aws-sdk/client-dynamodb';

let dbClient: DynamoDBClient | undefined;
let dbDocClient: DynamoDBDocumentClient | undefined;

export function getDBClient(): DynamoDBClient {
  dbClient ??= tracer.captureAWSv3Client(
    new DynamoDBClient({
      region: AppConfigService.getInstance().awsRegion,
      maxAttempts: 2,
      requestHandler: new NodeHttpHandler({ requestTimeout: 5000 }),
    }),
  );
  return dbClient;
}

export function getDBDocClient(): DynamoDBDocumentClient {
  dbDocClient ??= DynamoDBDocumentClient.from(getDBClient());

  return dbDocClient;
}
