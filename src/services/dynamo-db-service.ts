import {
  DynamoDBClient,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  UpdateItemCommand,
  UpdateItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import logger from '../commons/logger';
import { LOGS_PREFIX_SENSITIVE_INFO } from '../data-types/constants';
import { AppConfigService } from './app-config-service';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import tracer from '../commons/tracer';

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
    logger.debug(`${LOGS_PREFIX_SENSITIVE_INFO} Attempting request to dynamo db, with ID : ${userId}`);
    const parameters: QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: '#pk = :id_value',
      ExpressionAttributeNames: { '#pk': 'pk' },
      ExpressionAttributeValues: { ':id_value': { S: userId } },
    };

    const response: QueryCommandOutput = await this.dynamoClient.send(new QueryCommand(parameters));
    return response.Items;
  }

  public async updateUserStatus(userId: string, partialInput: Partial<UpdateItemCommandInput>) {
    const commandInput: UpdateItemCommandInput = {
      TableName: this.tableName,
      Key: { pk: { S: userId } },
      ...partialInput,
    };
    console.log('command input::');
    logger.debug(JSON.stringify(commandInput));
    console.log('formed command input');
    const command = new UpdateItemCommand(commandInput);
    console.log('sent command');
    const response = await this.dynamoClient.send(command);
    logger.debug(JSON.stringify(response));
    return response;
  }
}
