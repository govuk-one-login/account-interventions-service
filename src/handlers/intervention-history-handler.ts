import type { Context, APIGatewayEvent } from 'aws-lambda';

export const handle = async (event: APIGatewayEvent, context: Context): Promise<void> => {
  console.log(event);
  console.log(context);
};
