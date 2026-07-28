/* istanbul ignore start -- production only */

import awsLambdaFastify from '@fastify/aws-lambda';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { init } from '../frontend/app';
import logger from '../commons/logger';
import { InterventionClient } from '@govuk-one-login/ais-status-sdk';
import { JwtAuthoriser } from '../frontend/authoriser';
import { FeatureFlagsFromEnvironmentVariables } from '../services/feature-flags';
import { SqsMessageService } from '../services/message-service';
import { AppConfigService } from '../services/app-config-service';

const subpath = process.env['SUBPATH'] ?? '';

const config = AppConfigService.getInstance().getConfigObject(['statusApiUrl', 'txmaQueueUrl']);

const featureFlags = FeatureFlagsFromEnvironmentVariables.getInstance();

const authoriser = new JwtAuthoriser();

const interventionClient = new InterventionClient(config.statusApiUrl, {
  logger,
});

const messageService = new SqsMessageService(config.txmaQueueUrl);

const proxy = awsLambdaFastify(
  init(
    {
      interventionClient,
      messageService,
      authoriser,
    },
    {
      featureFlags,
    },
  ),
);

export const handler = (event: APIGatewayProxyEvent, context: Context) => proxy(rewriteEventPath(event), context);

const rewriteEventPath = (event: APIGatewayProxyEvent): APIGatewayProxyEvent => {
  if (subpath && event.path.startsWith(subpath)) {
    event.path = event.path.slice(subpath.length) || '/';
  }
  return event;
};
/* istanbul ignore stop */
