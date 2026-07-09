import fastify from 'fastify';
import view from '@fastify/view';
import staticFiles from '@fastify/static';
import formbody from '@fastify/formbody';
import nunjucks from 'nunjucks';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { InterventionClient, InterventionClientInterface } from '@govuk-one-login/ais-status-sdk';
import logger from '../commons/logger';

// In Lambda (bundled), node_modules is co-located with the handler in __dirname.
// In local dev (tsx from project root), node_modules is at the project root (process.cwd()).
const nodeModulesRoot = existsSync(path.join(__dirname, 'node_modules')) ? __dirname : process.cwd();

// Stage prefix for asset URLs — empty string locally, /v1 when behind API Gateway without a custom domain
const stagePrefix = process.env['STAGE_PREFIX'] ?? '';

const statusApiUrl = process.env['STATUS_API_URL'];

export function init(
  interventionClient: InterventionClientInterface = new InterventionClient({
    baseUrl: statusApiUrl,
    logger,
  }),
) {
  const server = fastify();

  // Parse URL-encoded form bodies (application/x-www-form-urlencoded)
  server.register(formbody);

  // Serve govuk assets under /assets/ — registers both the dist root (for CSS/JS)
  // and the assets subdirectory (for fonts, images, manifest) as a single plugin registration.
  // wildcard: false uses on-demand file lookup across all roots rather than pre-globbing,
  // which is required for multiple roots to work correctly.
  server.register(staticFiles, {
    root: [
      path.join(nodeModulesRoot, 'node_modules/govuk-frontend/dist/govuk'),
      path.join(nodeModulesRoot, 'node_modules/govuk-frontend/dist/govuk/assets'),
    ],
    prefix: '/assets/',
    wildcard: false,
  });

  server.register(view, {
    engine: { nunjucks },
    templates: [path.join(__dirname, 'views'), path.join(nodeModulesRoot, 'node_modules/govuk-frontend/dist')],
  });

  const assetPath = `${stagePrefix}/assets`;

  server.get('/', async (_request, reply) => reply.view('index.njk', { stagePrefix, assetPath }));

  // Accepts the submitted userId from the search form and redirects to the user details page.
  server.post<{ Body: { userId?: string } }>('/search', async (request, reply) => {
    const userId = request.body.userId?.trim() ?? '';
    return reply.redirect(`${stagePrefix}/user/${encodeURIComponent(userId)}`, 303);
  });

  // Fetches account status for the given userId and renders the details page.
  server.get<{ Params: { userId: string } }>('/user/:userId', async (request, reply) => {
    const userId = decodeURIComponent(request.params.userId).trim();

    if (!userId) return reply.code(400).send();

    const accountStatus = await interventionClient.getAccountStatus(userId);

    return reply.view('user-details.njk', { stagePrefix, assetPath, accountStatus, userId });
  });

  return server;
}
