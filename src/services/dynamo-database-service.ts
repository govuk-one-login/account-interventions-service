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
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { DynamoDBStateResult, FullAccountInformation } from '../data-types/interfaces';
import { TooManyRecordsError } from '../data-types/errors';

const appConfig = AppConfigService.getInstance();
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

  /**
   * A function to retrieve the DynamoDB record according to the given userId
   *
   * @param userId - the userId that comes from the request
   */
  public async getAccountStateInformation(userId: string): Promise<DynamoDBStateResult | undefined> {
    const parameters = this.getInputParameterForDatabaseQuery(userId);
    parameters.ProjectionExpression =
      'blocked, suspended, resetPassword, reproveIdentity, sentAt, appliedAt, isAccountDeleted';
    const response: QueryCommandOutput = await this.dynamoClient.send(new QueryCommand(parameters));
    const validatedResponse = this.validateQueryResponse<DynamoDBStateResult>(response);
    return validatedResponse ?? undefined;
  }

  /**
   * Function to retrieve the full record from DynamoDB
   * @param userId - user ID passed in via path params
   * @returns - unmarshalled record from dynamoDB or undefined
   */
  public async getFullAccountInformation(userId: string) {
    const parameters = this.getInputParameterForDatabaseQuery(userId);
    const response: QueryCommandOutput = await this.dynamoClient.send(new QueryCommand(parameters));
    return this.validateQueryResponse<FullAccountInformation>(response);
  }

  /**
   * A function to take a partially formed UpdateItemCommand input, form the full command, and send the command
   * @param userId - id of the user whose record is being updated
   * @param partialInput - Partial object for command input
   */
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

  public async updateDeleteStatus(userId: string) {
    const ttl = getCurrentTimestamp().seconds + appConfig.maxRetentionSeconds;
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
        ':false': { BOOL: false },
      },
      ConditionExpression:
        'attribute_exists(pk) AND (attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false)',
    };
    const command = new UpdateItemCommand(commandInput);
    try {
      const response = await this.dynamoClient.send(command);
      logger.info(`${LOGS_PREFIX_SENSITIVE_INFO} Account marked as deleted.`, { userId });
      logAndPublishMetric(MetricNames.MARK_AS_DELETED_SUCCEEDED);
      return response;
    } catch (error: unknown) {
      if (error instanceof Error && (!error.name || error.name !== 'ConditionalCheckFailedException')) {
        logger.error(`${LOGS_PREFIX_SENSITIVE_INFO} Error updating Dynamo DB.`, { error, userId });
        logAndPublishMetric(MetricNames.DB_UPDATE_ERROR);
        throw new Error('Error was not a Conditional Check Failed Exception.'); //Therefore re-driving message back to the queue.
      }
      logger.info(`${LOGS_PREFIX_SENSITIVE_INFO} No intervention exists for this account.`, { error, userId });
    }
  }

  /**
   * Function to configure query parameters for DynamoDB
   * @param userId - userId from the relevant event
   * @returns - the parameters needed to query DynamoDB
   */
  private getInputParameterForDatabaseQuery(userId: string): QueryCommandInput {
    logger.debug(`${LOGS_PREFIX_SENSITIVE_INFO} Attempting request to dynamo db.`, { userId });
    return {
      TableName: this.tableName,
      KeyConditionExpression: '#pk = :id_value',
      ExpressionAttributeNames: { '#pk': 'pk' },
      ExpressionAttributeValues: { ':id_value': { S: userId } },
    };
  }

  /**
   * Function to validate the response and send metrics if there is a problem with the received response
   * @param response - the response from dynamoDB
   */
  private validateQueryResponse<T>(response: QueryCommandOutput) {
    if (!response.Items) {
      const errorMessage = 'DynamoDB may have failed to query, returned a null response.';
      logger.error(errorMessage);
      logAndPublishMetric(MetricNames.DB_QUERY_ERROR_NO_RESPONSE);
      throw new Error(errorMessage);
    }

    if (response.Items.length > 1) {
      const errorMessage = 'DynamoDB returned more than one element.';
      logger.error(errorMessage);
      logAndPublishMetric(MetricNames.DB_QUERY_ERROR_TOO_MANY_ITEMS);
      throw new TooManyRecordsError(errorMessage);
    }
    return response.Items[0] ? (unmarshall(response.Items[0]) as T) : undefined;
  }
}
