import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
const dynamodbClient = new DynamoDBClient();

export const handler = async (event: { pk: string }): Promise<void> => {
  const pk = event.pk;
  const ttl = Date.now() + this.maxRetentionSeconds * 1000;

  const parameters = {
    TableName: this.tableName,
    Key: {
      pk: { S: pk },
    },
    UpdateExpression: 'SET #status = :status, #deleteTime = :deleteTime',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#ttl': 'ttl',
    },
    ExpressionAttributeValues: {
      ':status': { S: 'deleted' },
      ':ttl': { N: ttl.toString() },
    },
    ConditionExpression: 'attribute_exists(pk)',
  };

  const command = new UpdateItemCommand(parameters);

  try {
    await dynamodbClient.send(command);
    console.log(`Account ${pk} marked as deleted`);
  } catch (error) {
    console.log(`Error updating account ${pk}: ${error}`);
  }
};
