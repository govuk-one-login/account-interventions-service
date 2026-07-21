import fastify from 'fastify';
import view from '@fastify/view';
import staticFiles from '@fastify/static';
import formbody from '@fastify/formbody';
import nunjucks from 'nunjucks';
import path from 'node:path';
import { existsSync } from 'node:fs';
import {
  AccountHistory,
  HistoryLine,
  InterventionClient,
  InterventionClientInterface,
} from '@govuk-one-login/ais-status-sdk';
import logger from '../commons/logger';
import { FeatureFlagsFromEnvironmentVariables, FeatureFlags } from '../services/feature-flags';
import cookie from '@fastify/cookie';
import { MessageService, SqsMessageService } from '../services/message-service';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { TriggerEventsEnum } from '../data-types/constants';
import { randomUUID } from 'node:crypto';
import { TicfAccountIntervention } from '../contracts/intervention-events';
import { normalisePathSegment } from '../commons/utils/normalise-path-segment';

// In Lambda (bundled), node_modules is co-located with the handler in __dirname.
// In local dev (tsx from project root), node_modules is at the project root (process.cwd()).
const nodeModulesRoot = existsSync(path.join(__dirname, 'node_modules')) ? __dirname : process.cwd();

/**
 * Stage prefix for asset URLs — empty string locally, /v1 when behind API Gateway without a custom domain
 */
const stagePrefix = normalisePathSegment(process.env['STAGE_PREFIX'] ?? '');

/**
 * Subpath prefix — prepended to asset URLs so the browser requests assets through the correct API Gateway path.
 * e.g. if SUBPATH=/interventions, assets are served at /interventions/assets/* and the Lambda strips
 * the subpath prefix before routing (see frontend-handler.ts rewriteEventPath).
 */
const subpath = normalisePathSegment(process.env['SUBPATH'] ?? '');

const statusApiUrl = process.env['STATUS_API_URL'];
const txmaQueueUrl = process.env['TXMA_QUEUE_URL'];

// Format an ISO date string or Unix timestamp (ms) into a human-readable UK date/time, e.g. "10 October 2023 at 20:22:02 UTC"
function formatDate(value: string | number): string {
  const date = new Date(value);

  return (
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) +
    ' at ' +
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) +
    ' UTC'
  );
}

export function init(
  interventionClient: InterventionClientInterface = new InterventionClient(statusApiUrl, {
    logger,
  }),
  featureFlags: FeatureFlags = FeatureFlagsFromEnvironmentVariables.getInstance(),
  messageService: MessageService = new SqsMessageService(txmaQueueUrl),
) {
  const server = fastify();

  if (!featureFlags.isEnabled('aisFrontend')) return server;

  // Parse URL-encoded form bodies (application/x-www-form-urlencoded)
  server.register(formbody);

  // Parse cookies (used for flash messages)
  server.register(cookie);

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

  /**
   * pathPrefix combines subpath and stagePrefix for constructing page-level navigation URLs.
   * Templates and redirects use this so links resolve correctly through the API Gateway subpath.
   */
  const pathPrefix = `${subpath}${stagePrefix}`;
  const assetPath = `${pathPrefix}/assets`;

  server.get('/', async (_request, reply) => reply.view('index.njk', { pathPrefix, assetPath }));

  // Accepts the submitted userId from the search form and redirects to the user details page.
  server.post<{ Body: { userId?: string } }>('/search', async (request, reply) => {
    const userId = request.body.userId?.trim() ?? '';
    return reply.redirect(`${pathPrefix}/user/${encodeURIComponent(userId)}`, 303);
  });

  // Fetches account status for the given userId and renders the details page.
  server.get<{ Params: { userId: string } }>('/user/:userId', async (request, reply) => {
    const userId = decodeURIComponent(request.params.userId).trim();

    if (!userId) return reply.code(400).send();

    // Read and immediately clear the flash cookie so the banner only shows once.
    // eslint-disable-next-line unicorn/consistent-boolean-name
    const messageSent = request.cookies['flash_message_sent'] === 'true';
    if (messageSent) {
      void reply.clearCookie('flash_message_sent', { path: '/' });
    }

    const accountStatus = await interventionClient.getAccountStatus(userId);
    const accountHistory = await interventionClient.getAccountHistory(userId);

    return reply.view('user-details.njk', {
      pathPrefix,
      assetPath,
      accountStatus,
      userId,
      accountHistory: formatHistory(accountHistory),
      messageSent,
      aisSendTxMA: featureFlags.isEnabled('aisSendTxMA'),
    });
  });

  // Sends a TxMA audit event for the given userId and redirects back to the user details page.
  server.post<{ Body: { userId?: string } }>('/send', async (request, reply) => {
    if (!featureFlags.isEnabled('aisSendTxMA')) return reply.code(404).send();

    const userId = request.body.userId?.trim() ?? '';

    const timestamp = getCurrentTimestamp();

    const event: TicfAccountIntervention = {
      event_id: randomUUID(),
      event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
      component_id: 'AIS',
      timestamp: timestamp.seconds,
      event_timestamp_ms: timestamp.milliseconds,
      user: { user_id: userId },
      extensions: {
        intervention: {
          intervention_code: '01',
          intervention_reason: '',
          requester_id: 'interventions@digital.cabinet-office.gov.uk',
        },
      },
    };

    await messageService.sendMessage(event);

    reply.setCookie('flash_message_sent', 'true', {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 60, // expires in 60 seconds — more than enough for the redirect round-trip
    });

    return reply.redirect(`${pathPrefix}/user/${encodeURIComponent(userId)}`, 303);
  });

  return server;
}

interface HistoryTransaction extends Omit<HistoryLine, 'interventionName' | 'interventionState'> {
  tagId: string;
  sentAtFormatted: string;
  interventionEvents: HistoryLine[];
}

export const formatHistory = (history: AccountHistory): HistoryTransaction[] =>
  Object.values(
    history.lines.reduce<Record<string, HistoryTransaction>>((result, line) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { interventionName, interventionState, ...rest } = line;

      result[line.tagId] = {
        ...rest,
        sentAtFormatted: formatDate(line.sentAt),
        interventionEvents: [...(result[line.tagId]?.interventionEvents ?? []), line],
      };

      return result;
    }, {}),
  ).toSorted((a, b) => b.sentAt - a.sentAt);
