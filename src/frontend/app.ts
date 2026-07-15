import fastify, { FastifyRequest } from 'fastify';
import view from '@fastify/view';
import staticFiles from '@fastify/static';
import formbody from '@fastify/formbody';
import nunjucks from 'nunjucks';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { getStagePrefixForRequest } from './stage-prefix';
import { InterventionClient, InterventionClientInterface } from '@govuk-one-login/ais-status-sdk';
import logger from '../commons/logger';
import { FeatureFlagsFromEnvironmentVariables, FeatureFlags } from '../services/feature-flags';

const getAssetPath = (request: FastifyRequest) => `${getStagePrefixForRequest(request)}/assets`;

// In Lambda (bundled), node_modules is co-located with the handler in __dirname.
// In local dev (tsx from project root), node_modules is at the project root (process.cwd()).
const nodeModulesRoot = existsSync(path.join(__dirname, 'node_modules')) ? __dirname : process.cwd();

const statusApiUrl = process.env['STATUS_API_URL'];

export function init(
  interventionClient: InterventionClientInterface = new InterventionClient({
    baseUrl: statusApiUrl,
    logger,
  }),
  featureFlags: FeatureFlags = FeatureFlagsFromEnvironmentVariables.getInstance(),
) {
  const server = fastify();

  if (!featureFlags.isEnabled('aisFrontend')) return server;

  // Parse URL-encoded form bodies (application/x-www-form-urlencoded)
  server.register(formbody);

  // Read the govuk-frontend CSS once at startup. The file contains hardcoded url(/assets/...)
  // paths for fonts and images which must be rewritten to include the stage prefix.
  // Because the prefix varies per-request (/interventions vs /v1 vs empty for local dev),
  // we serve this file through a route handler rather than patching it at build time.
  const govukCssPath = path.join(nodeModulesRoot, 'node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.css');
  const govukCssBase = readFileSync(govukCssPath, 'utf8');

  // Serve govuk assets under /assets/ — registers both the dist root (for CSS/JS)
  // and the assets subdirectory (for fonts, images, manifest) as a single plugin registration.
  // Uses the default wildcard: true so a single glob route is registered, allowing our
  // explicit /assets/govuk-frontend.min.css route below to take precedence for that file.
  server.register(staticFiles, {
    root: [
      path.join(nodeModulesRoot, 'node_modules/govuk-frontend/dist/govuk'),
      path.join(nodeModulesRoot, 'node_modules/govuk-frontend/dist/govuk/assets'),
    ],
    prefix: '/assets/',
  });

  server.register(view, {
    engine: { nunjucks },
    templates: [path.join(__dirname, 'views'), path.join(nodeModulesRoot, 'node_modules/govuk-frontend/dist')],
  });

  server.get('/', async (request, reply) => {
    const assetPath = getAssetPath(request);
    return reply.view('index.njk', { assetPath });
  });

  // Accepts the submitted userId from the search form and redirects to the user details page.
  server.post<{ Body: { userId?: string } }>('/search', async (request, reply) => {
    const stagePrefix = getStagePrefixForRequest(request);

    const userId = request.body.userId?.trim() ?? '';
    return reply.redirect(`${stagePrefix}/user/${encodeURIComponent(userId)}`, 303);
  });

  // Fetches account status for the given userId and renders the details page.
  server.get<{ Params: { userId: string } }>('/user/:userId', async (request, reply) => {
    const stagePrefix = getStagePrefixForRequest(request);
    const assetPath = getAssetPath(request);

    const userId = decodeURIComponent(request.params.userId).trim();

    if (!userId) return reply.code(400).send();

    const accountStatus = await interventionClient.getAccountStatus(userId);

    return reply.view('user-details.njk', { stagePrefix, assetPath, accountStatus, userId });
  });

  // Intercept the govuk CSS before @fastify/static serves it so we can rewrite the
  // hardcoded url(/assets/...) font and image paths to include the per-request stage prefix.
  server.get('/assets/govuk-frontend.min.css', async (request, reply) => {
    const stagePrefix = getStagePrefixForRequest(request);
    const css = stagePrefix
      ? // eslint-disable-next-line unicorn/no-unsafe-string-replacement
        govukCssBase.replaceAll('url(/assets/', `url(${stagePrefix}/assets/`)
      : govukCssBase;
    return reply.type('text/css').send(css);
  });

  return server;
}
