import type { Context, APIGatewayEvent } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

export const handle = async (event: APIGatewayEvent, context: Context): Promise<void> => {
  console.log(event);
  console.log(context);
  const client = new DynamoDBClient();
  const command = new PutItemCommand({
    TableName: 'ais-core-interventions-history',
    Item: {
      AccountId: {
        S: 'testAccountID',
      },
      CreatedAt: {
        N: Math.floor(Date.now() / 1000).toString(),
      },
    },
  });

  const response = await client.send(command);
  console.log(response);
};
