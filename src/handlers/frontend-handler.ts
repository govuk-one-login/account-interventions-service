/* istanbul ignore start -- production only */

import awsLambdaFastify from '@fastify/aws-lambda';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { init } from '../frontend/app';

const subpath = process.env['SUBPATH'] ?? '';

const proxy = awsLambdaFastify(init());

export const handler = (event: APIGatewayProxyEvent, context: Context) => proxy(rewriteEventPath(event), context);

const rewriteEventPath = (event: APIGatewayProxyEvent): APIGatewayProxyEvent => {
  if (subpath && event.path.startsWith(subpath)) {
    event.path = event.path.slice(subpath.length) || '/';
  }
  return event;
};
/* istanbul ignore stop */
