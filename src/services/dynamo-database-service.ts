import {
  DynamoDBClient,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  UpdateItemCommand,
  UpdateItemCommandInput,
  UpdateItemCommandOutput,
} from '@aws-sdk/client-dynamodb';
import logger from '../commons/logger';
import { LOGS_PREFIX_SENSITIVE_INFO, MetricNames } from '../data-types/constants';
import { AppConfigService } from './app-config-service';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import tracer from '../commons/tracer';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { logAndPublishMetric } from '../commons/metrics';
import { StateDetails } from '../data-types/interfaces';

export class DynamoDatabaseService {
  private dynamoClient: DynamoDBClient;
  private readonly tableName: string;

  public constructor(tableName: string) {
    this.dynamoClient = tracer.captureAWSv3Client(
      new DynamoDBClient({
        region: AppConfigService.getInstance().awsRegion,
        maxAttempts: 2,
        requestHandler: new NodeHttpHandler({ requestTimeout: 5000 }),
      }),
    );
    this.tableName = tableName;
  }

  public async retrieveRecordsByUserId(userId: string) {
    logger.debug(`${LOGS_PREFIX_SENSITIVE_INFO} Attempting request to dynamo db, with ID : ${userId}`);
    const parameters: QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: '#pk = :id_value',
      ExpressionAttributeNames: { '#pk': 'pk', '#isAccountDeleted': 'isAccountDeleted' },
      ExpressionAttributeValues: { ':id_value': { S: userId }, ':isAccountDeleted': { BOOL: false } },
      FilterExpression: 'attribute_not_exists(isAccountDeleted) OR #isAccountDeleted = :isAccountDeleted',
      ProjectionExpression: 'blocked, suspended, resetPassword, reproveIdentity',
    };

    const response: QueryCommandOutput = await this.dynamoClient.send(new QueryCommand(parameters));
    if (!response.Items) {
      const errorMessage = 'DynamoDB may have failed to query, returned a null response.';
      logger.error(errorMessage);
      logAndPublishMetric(MetricNames.DB_QUERY_ERROR_NO_RESPONSE);
      throw new Error(errorMessage);
    }
    return response.Items[0] ? (unmarshall(response.Items[0]) as StateDetails) : undefined;
  }

  public async updateUserStatus(
    userId: string,
    partialInput: Partial<UpdateItemCommandInput>,
  ): Promise<UpdateItemCommandOutput> {
    const commandInput: UpdateItemCommandInput = {
      TableName: this.tableName,
      Key: { pk: { S: userId } },
      ...partialInput,
    };
    const command = new UpdateItemCommand(commandInput);
    return await this.dynamoClient.send(command);
  }
}
