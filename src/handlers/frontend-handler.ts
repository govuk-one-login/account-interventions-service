/* v8 ignore file -- production only */

import awsLambdaFastify from '@fastify/aws-lambda';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { init } from '../frontend/app';
import { deriveStagePrefixFromEvent } from '../frontend/stage-prefix';

const proxy = awsLambdaFastify(init());

export const handler = (event: APIGatewayProxyEvent, context: Context) => proxy(rewriteEventPath(event), context);

const rewriteEventPath = (event: APIGatewayProxyEvent): APIGatewayProxyEvent => {
  const prefix = deriveStagePrefixFromEvent(event);
  if (prefix && event.path.startsWith(prefix)) {
    event.path = event.path.slice(prefix.length) || '/';
  }
  return event;
};
