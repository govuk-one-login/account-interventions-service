import fastify from 'fastify';
import view from '@fastify/view';
import staticFiles from '@fastify/static';
import nunjucks from 'nunjucks';
import path from 'node:path';
import { existsSync } from 'node:fs';

// In Lambda (bundled), node_modules is co-located with the handler in __dirname.
// In local dev (tsx from project root), node_modules is at the project root (process.cwd()).
const nodeModulesRoot = existsSync(path.join(__dirname, 'node_modules'))
  ? __dirname
  : process.cwd();

// Stage prefix for asset URLs — empty string locally, /v1 when behind API Gateway without a custom domain
const stagePrefix = process.env['STAGE_PREFIX'] ?? '';

export function init() {
  const server = fastify();

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
    templates: [
      path.join(__dirname, 'views'),
      path.join(nodeModulesRoot, 'node_modules/govuk-frontend/dist'),
    ],
  });

  server.get('/', async (_request, reply) => reply.view('index.njk', { assetPath: `${stagePrefix}/assets` }));

  return server;
}
