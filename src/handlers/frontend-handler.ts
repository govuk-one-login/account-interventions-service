/* v8 ignore file -- production only */

import awsLambdaFastify from '@fastify/aws-lambda';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { init } from '../frontend/app';

const proxy = awsLambdaFastify(init());

export const handler = (event: APIGatewayProxyEvent, context: Context) => proxy(event, context);
