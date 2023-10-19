// import { QueryCommand, QueryCommandInput } from '@aws-sdk/client-dynamodb';
import type { Context, APIGatewayEvent } from 'aws-lambda';
import { AppConfigService } from '../services/app-config-service';
import { DynamoDbService as DynamoDatabaseService } from '../services/dynamo-db-service'
import logger from '../commons/logger';
import { logAndPublishMetric } from '../commons/metrics';
import { AISInterventionTypes, MetricNames } from '../data-types/constants';

const appConfig = AppConfigService.getInstance();
const dynamoDBServiceInstance = new DynamoDatabaseService(appConfig.tableName);

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
      
  try {
    const response = await dynamoDBServiceInstance.retrieveRecordsByUserId(userId);

    if (!response || response.length < 1) {
    logger.debug('Requested account is not suspended');
    logAndPublishMetric(AISInterventionTypes.AIS_NO_INTERVENTION);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No suspension.' }),
      }
    }
    return { 
      statusCode: 200, 
      body: JSON.stringify(response) 
    }
  } catch (error) {
    logger.error('A problem occured with the query', { error });
    //may change this metric to DB_QUERY_ERROR?
    logAndPublishMetric(MetricNames.DB_QUERY_ERROR_NO_RESPONSE);
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

  // const queryParameters: QueryCommandInput = ({
    //   TableName: 'account-status',
    //   //will review this, unsure if the keyExpession is correct as userId will be something like: "urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9NCEp5d4"
    //   KeyConditionExpression: "userID = :userID",
    //   ExpressionAttributeValues: {
    //     ":userID": { S: decodeURIComponent(userId) },
    //   },
    // });
    
  // const command = new QueryCommand(queryParameters);