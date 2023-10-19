import { DynamoDBClient, QueryCommand, QueryCommandInput } from '@aws-sdk/client-dynamodb';
import type { Context, APIGatewayEvent } from 'aws-lambda';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import logger from '../commons/logger';

const ddbClient = new DynamoDBClient({
  region: 'eu-west-2',
  maxAttempts: 2,
  requestHandler: new NodeHttpHandler({ requestTimeout: 5000 })
});

export const handle = async (event: APIGatewayEvent, context: Context) => {
  logger.addContext(context);
  logger.debug('Status-Retriever-Handler.');

  const userId = event.pathParameters?.['userId'];
  if (!userId || eventValidation(userId) === '') {
    return {
      //not sure if a 400 is correct, placeholder for now
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid Request.'}),
    }
  }

  const queryParameters: QueryCommandInput = ({
    TableName: 'account-status',
    //will review this, unsure if the keyExpession is correct as userId will be something like: "urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9NCEp5d4"
    KeyConditionExpression: "userID = :userID",
    ExpressionAttributeValues: {
      ":userID": { S: decodeURIComponent(userId) },
    },
  });

  const command = new QueryCommand(queryParameters);
  
  try {
    const response = await ddbClient.send(command);
    if (!response.Items || response.Count === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No suspension.' }),
      }
    }
    return {
      statusCode: 200,
      body: JSON.stringify(response),
    }
  } catch (error) {
    logger.error('A problem occured with the query', { error });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Unable to retrieve records' }),
    }
  }
}

//rename? is this function needed?
function eventValidation(userId: string) {
  if (userId.trim() === '') {
    logger.error('Attribute invalid: user_id is empty.');
  }
  return userId.trim();
}
