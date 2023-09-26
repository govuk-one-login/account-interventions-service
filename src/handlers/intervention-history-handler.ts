import type { Context, APIGatewayEvent } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import logger from '../commons/logger';

export const handle = async (event: APIGatewayEvent, context: Context): Promise<void> => {
  logger.addContext(context);
  logger.debug(JSON.stringify(event));
  const client = new DynamoDBClient();
  const command = new PutItemCommand({
    TableName: 'ais-core-interventions-history',
    Item: {
      pk: {
        S: 'testAccountID',
      },
      sk: {
        N: Math.floor(Date.now() / 1000).toString(),
      },
    },
  });

  const response = await client.send(command);
  logger.debug(JSON.stringify(response));
};
