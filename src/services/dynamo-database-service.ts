import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import logger from '../commons/logger';
import { LOGS_PREFIX_SENSITIVE_INFO, MetricNames } from '../data-types/constants';
import { AppConfigService } from './app-config-service';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import tracer from '../commons/tracer';
import { addMetric } from '../commons/metrics';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { DynamoDBStateResult, FullAccountInformation } from '../data-types/interfaces';
import { TooManyRecordsError } from '../data-types/errors';
import { updateAccountStateCountMetricAfterDeletion } from '../commons/metrics-helper';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  UpdateCommand,
  UpdateCommandInput,
  UpdateCommandOutput,
} from '@aws-sdk/lib-dynamodb';

const appConfig = AppConfigService.getInstance();
export class DynamoDatabaseService {
  private readonly dbDocClient: DynamoDBDocumentClient;

  public constructor(private readonly tableName: string) {
    const dynamoClient = tracer.captureAWSv3Client(
      new DynamoDBClient({
        region: AppConfigService.getInstance().awsRegion,
        maxAttempts: 2,
        requestHandler: new NodeHttpHandler({ requestTimeout: 5000 }),
      }),
    );

    this.dbDocClient = DynamoDBDocumentClient.from(dynamoClient);
  }

  /**
   * A function to retrieve the DynamoDB record according to the given userId
   *
   * @param userId - the userId that comes from the request
   */
  public async getAccountStateInformation(userId: string): Promise<DynamoDBStateResult | undefined> {
    const parameters = this.getInputParameterForDatabaseQuery(userId);
    parameters.ProjectionExpression =
      'blocked, suspended, resetPassword, reproveIdentity, sentAt, appliedAt, isAccountDeleted, history, intervention';
    const response: QueryCommandOutput = await this.dbDocClient.send(new QueryCommand(parameters));
    return this.validateQueryResponse<DynamoDBStateResult>(response);
  }

  /**
   * Function to retrieve the full record from DynamoDB
   * @param userId - user ID passed in via path params
   * @returns - unmarshalled record from dynamoDB or undefined
   */
  public async getFullAccountInformation(userId: string) {
    const parameters = this.getInputParameterForDatabaseQuery(userId);
    const response: QueryCommandOutput = await this.dbDocClient.send(new QueryCommand(parameters));
    return this.validateQueryResponse<FullAccountInformation>(response);
  }

  /**
   * A function to take a partially formed UpdateItemCommand input, form the full command, and send the command
   * @param userId - id of the user whose record is being updated
   * @param partialInput - Partial object for command input
   */
  public async updateUserStatus(
    userId: string,
    partialInput: Partial<UpdateCommandInput>,
  ): Promise<UpdateCommandOutput> {
    const commandInput: UpdateCommandInput = {
      TableName: this.tableName,
      Key: { pk: userId },
      ...partialInput,
    };
    const command = new UpdateCommand(commandInput);
    return await this.dbDocClient.send(command);
  }

  /**
   * Method for marking a user account for deletion by matching the user id to an account.
   * @param userId - Passed in as a string, taken from a SQS Event.
   * @returns - Response from DynamoDB, marking the account as deleted.
   * @throws - DynamoDB exceptions, will redrive if it is not a ConditionalCheckFailedException.
   */
  public async updateDeleteStatus(userId: string) {
    const now = getCurrentTimestamp();
    const ttl = now.seconds + appConfig.maxRetentionSeconds;
    const commandInput: UpdateCommandInput = {
      TableName: this.tableName,
      Key: { pk: userId },
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted, #ttl = :ttl, #deletedAt = :deletedAt',
      ExpressionAttributeNames: {
        '#isAccountDeleted': 'isAccountDeleted',
        '#ttl': 'ttl',
        '#deletedAt': 'deletedAt',
      },
      ExpressionAttributeValues: {
        ':isAccountDeleted': true,
        ':ttl': ttl.toString(),
        ':false': false,
        ':deletedAt': now.milliseconds.toString(),
      },
      ReturnValues: 'ALL_NEW',
      ConditionExpression:
        'attribute_exists(pk) AND (attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false)',
    };
    const command = new UpdateCommand(commandInput);
    try {
      const response = await this.dbDocClient.send(command);
      if (response.Attributes) {
        const responseObject = response.Attributes as unknown as FullAccountInformation;
        updateAccountStateCountMetricAfterDeletion(responseObject);
      }
      logger.info(`${LOGS_PREFIX_SENSITIVE_INFO} Account marked as deleted.`, { userId });
      addMetric(MetricNames.MARK_AS_DELETED_SUCCEEDED);
      return response;
    } catch (error: unknown) {
      if (error instanceof Error && (!error.name || error.name !== 'ConditionalCheckFailedException')) {
        logger.error(`${LOGS_PREFIX_SENSITIVE_INFO} Error updating Dynamo DB.`, { error, userId });
        addMetric(MetricNames.DB_UPDATE_ERROR);
        throw new Error('Error was not a Conditional Check Failed Exception.', { cause: error }); //Therefore re-driving message back to the queue.
      }
      logger.info(`${LOGS_PREFIX_SENSITIVE_INFO} No intervention exists for this account.`, { error, userId });
    }
  }

  /**
   * Function to configure query parameters for DynamoDB.
   * @param userId - userId from the relevant event
   * @returns - the parameters needed to query DynamoDB
   */
  private getInputParameterForDatabaseQuery(userId: string): QueryCommandInput {
    logger.debug(`${LOGS_PREFIX_SENSITIVE_INFO} Attempting request to dynamo db.`, { userId });
    return {
      TableName: this.tableName,
      KeyConditionExpression: '#pk = :id_value',
      ExpressionAttributeNames: { '#pk': 'pk' },
      ExpressionAttributeValues: { ':id_value': userId },
    };
  }

  /**
   * Function to validate the response and send metrics if there is a problem with the received response
   * @param response - the response from dynamoDB
   */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  private validateQueryResponse<T>(response: QueryCommandOutput): T | undefined {
    if (!response.Items) {
      const errorMessage = 'DynamoDB may have failed to query, returned a null response.';
      logger.error(errorMessage);
      addMetric(MetricNames.DB_QUERY_ERROR_NO_RESPONSE);
      throw new Error(errorMessage);
    }

    if (response.Items.length > 1) {
      const errorMessage = 'DynamoDB returned more than one element.';
      logger.error(errorMessage);
      addMetric(MetricNames.DB_QUERY_ERROR_TOO_MANY_ITEMS);
      throw new TooManyRecordsError(errorMessage);
    }
    return (response.Items[0] as unknown as T) ?? undefined;
  }
}
