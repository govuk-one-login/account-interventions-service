import fastify from 'fastify';
import view from '@fastify/view';
import staticFiles from '@fastify/static';
import nunjucks from 'nunjucks';
import path from 'node:path';

export function init() {
  const server = fastify();

  server.register(staticFiles, {
    root: path.join(__dirname, '../../node_modules/govuk-frontend/dist/govuk/assets'),
    prefix: '/assets/',
  });

  // Serve govuk-frontend CSS and JS directly under /assets/
  const govukDistribution = path.join(__dirname, '../../node_modules/govuk-frontend/dist/govuk');

  for (const file of ['govuk-frontend.min.css', 'govuk-frontend.min.js']) {
    server.get(`/assets/${file}`, (_request, reply) => reply.sendFile(file, govukDistribution));
  }

  server.register(view, {
    engine: { nunjucks },
    templates: ['src/frontend/views', 'node_modules/govuk-frontend/dist'],
  });

  server.get('/', async (_request, reply) => reply.view('index.njk'));

  return server;
}
