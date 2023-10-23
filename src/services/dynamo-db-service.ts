import {
  AttributeValue,
  DynamoDBClient,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  UpdateItemCommand,
  UpdateItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import logger from '../commons/logger';
import { LOGS_PREFIX_SENSITIVE_INFO, MetricNames } from '../data-types/constants';
import { logAndPublishMetric } from '../commons/metrics';
import { AppConfigService } from './app-config-service';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import tracer from '../commons/tracer';
import { StateDetails } from '../data-types/interfaces';

const appConfig = AppConfigService.getInstance();

export class DynamoDbService {
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
    const items: Record<string, AttributeValue>[] = [];
    let lastEvaluatedKey;
    logger.debug(`${LOGS_PREFIX_SENSITIVE_INFO} Attempting request to dynamo db, with ID : ${userId}`);
    const parameters: QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: '#pk = :id_value',
      ExpressionAttributeNames: { '#pk': 'pk' },
      ExpressionAttributeValues: { ':id_value': { S: userId } },
    };

    do {
      if (lastEvaluatedKey) {
        parameters.ExclusiveStartKey = lastEvaluatedKey;
        logAndPublishMetric(MetricNames.DB_QUERY_HAS_LEK);
        logger.debug('Non-null LastEvaluatedKey has been received');
      }
      const response: QueryCommandOutput = await this.dynamoClient.send(new QueryCommand(parameters));
      if (response === undefined) {
        const errorMessage = 'DynamoDB may have failed to query, returned a null response.';
        logger.error(errorMessage);
        logAndPublishMetric(MetricNames.DB_QUERY_ERROR_NO_RESPONSE);
        throw new Error(errorMessage);
      } else {
        for (const item of response.Items!) {
          items.push(item);
        }
        lastEvaluatedKey = response.LastEvaluatedKey ?? undefined;
      }
    } while (lastEvaluatedKey);
    return items;
  }

  public async putItemForUserId(userId: string, newState: StateDetails) {
    const commandInput: UpdateItemCommandInput = {
      TableName: this.tableName,
      Key: { pk: { S: userId } },
      ExpressionAttributeNames: {
        '#B': 'blocked',
        '#S': 'suspended',
        '#RP': 'resetPassword',
        '#RI': 'reproveIdentity',
      },
      ExpressionAttributeValues: {
        ':b': { BOOL: newState.blocked },
        ':s': { BOOL: newState.suspended },
        ':rp': { BOOL: newState.resetPassword },
        ':ri': { BOOL: newState.reproveIdentity },
      },
      UpdateExpression: 'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri',
    };
    const command = new UpdateItemCommand(commandInput);
    const response = await this.dynamoClient.send(command);
    logger.debug(JSON.stringify(response));
    return response;
  }

  public async updateDeleteStatus(userId: string) {
    const ttl = Date.now() + appConfig.maxRetentionSeconds * 1000;
    const commandInput: UpdateItemCommandInput = {
      TableName: this.tableName,
      Key: { pk: { S: userId } },
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#isAccountDeleted': 'isAccountDeleted',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':isAccountDeleted': { BOOL: true },
        ':ttl': { N: ttl.toString() },
      },
      ConditionExpression: 'attribute_exists(pk)',
    };
    const command = new UpdateItemCommand(commandInput);
    const response = await this.dynamoClient.send(command);
    logger.debug(JSON.stringify(response));
    return response;
  }
}
