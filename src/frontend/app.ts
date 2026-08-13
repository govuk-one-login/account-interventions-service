import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import view from '@fastify/view';
import staticFiles from '@fastify/static';
import formbody from '@fastify/formbody';
import nunjucks from 'nunjucks';
import path from 'node:path';
import { existsSync } from 'node:fs';
import {
  AccountHistory,
  HistoryLine,
  InterventionClientInterface,
  InterventionName,
  InterventionState,
} from '@govuk-one-login/ais-status-sdk';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { FeatureFlags } from '../services/feature-flags';
import cookie from '@fastify/cookie';
import { MessageService } from '../services/message-service';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import { isCode, TriggerEventsEnum } from '../data-types/constants';
import { randomUUID } from 'node:crypto';
import { TicfAccountIntervention } from '../contracts/intervention-events';
import { normalisePathSegment } from '../commons/utils/normalise-path-segment';
import { transitionConfig, interventionTypeMap } from '../services/account-states/config';
import { Authoriser } from './authoriser';

declare module 'fastify' {
  interface FastifyRequest {
    awsLambda?: { event: APIGatewayProxyEvent; context: Context };
  }
}

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

/**
 * Source tag values - an array of values that get passed to the user-details template which are then used to
 * render the tag element that differentiates between automated interventions and human applied ones.
 */
const automatedSources = ['TICF CRI'];
const faiSources = ['FAI'];
const siraSources = ['CMS'];

// Format an ISO date string or Unix timestamp (ms) into a human-readable UK date/time, e.g. "10 October 2023 at 20:22:02 UTC"
function formatDate(value: string | number): string {
  const date = new Date(value);

  return (
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) +
    ' ' +
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
  );
}

export const generateVerifyRequest =
  (authoriser: Authoriser) => async (request: FastifyRequest, reply: FastifyReply) => {
    const authoriserResult = await authoriser.verify(request.awsLambda?.event.requestContext.authorizer, request.url);

    if (!authoriserResult.success) return reply.status(401);
  };

export interface FrontendAppDependencies {
  interventionClient: InterventionClientInterface;
  messageService: MessageService;
  authoriser: Authoriser;
}

export interface FrontendAppConfig {
  featureFlags: FeatureFlags;
}

export function init(
  { interventionClient, messageService, authoriser }: FrontendAppDependencies,
  { featureFlags }: FrontendAppConfig,
) {
  const server = fastify();

  if (!featureFlags.isEnabled('aisFrontend')) return server;

  // Parse URL-encoded form bodies (application/x-www-form-urlencoded)
  server.register(formbody);

  // Parse cookies (used for flash messages)
  server.register(cookie);

  // Verify the FAI-issued JWT on every request.
  // FAI's Lambda authoriser puts the signed JWT string at requestContext.authorizer.jwt,
  // alongside other flat string fields like principalId and redirect.
  // We verify the signature here against FAI's KMS public key so we can trust the claims.
  server.addHook('onRequest', generateVerifyRequest(authoriser));

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
    const messageSent = request.cookies['flash_message_sent'] === 'true';
    if (messageSent) {
      void reply.clearCookie('flash_message_sent', { path: '/' });
    }

    const accountStatus = await interventionClient.getAccountStatus(userId);
    const accountHistory = await interventionClient.getAccountHistory(userId);

    // Flag, per intervention, whether each event's state should be displayed. The state
    // is only shown when the intervention transitions to or from ACTIVE, relative to the
    // last time that intervention appeared in the history — even if that appearance
    // wasn't the immediately previous history event.
    const comparedHistory = flagInterventionStateChanges(accountHistory);

    const interventions = Object.entries(transitionConfig.edges)
      .filter(([_code, edge]) => edge.interventionName)
      .map(([code, edge]) => ({
        value: code,
        text: `${code} - ${edge.name}`,
      }));

    return reply.view('user-details.njk', {
      pathPrefix,
      assetPath,
      accountStatus,
      transitionConfig,
      userId,
      accountHistory: formatHistory(comparedHistory),
      messageSent,
      aisSendTxMA: featureFlags.isEnabled('aisSendTxMA'),
      interventions,
      automatedSources,
      faiSources,
      siraSources,
      interventionTypeMap,
    });
  });

  // Sends a TxMA audit event for the given userId and redirects back to the user details page.
  server.post<{ Body: { userId?: string; interventionCode?: string } }>('/send', async (request, reply) => {
    if (!featureFlags.isEnabled('aisSendTxMA')) return reply.code(404).send();

    const userId = request.body.userId?.trim();

    if (!userId) {
      return reply.code(422).send({
        error: 'Missing userId',
        message: 'A user ID is required to send an intervention event. Please provide a valid user ID.',
      });
    }

    const interventionCode = request.body.interventionCode;

    if (!interventionCode) {
      return reply.code(422).send({
        error: 'Missing interventionCode',
        message: 'An intervention code is required. Please select an intervention code before submitting.',
      });
    }

    if (!isCode(interventionCode)) {
      return reply.code(422).send({
        error: 'Invalid interventionCode',
        message: `"${interventionCode}" is not a recognised intervention code. Please provide a valid code.`,
      });
    }

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
          intervention_code: interventionCode,
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

/**
 * A HistoryLine augmented with a flag indicating whether its intervention state
 * should be displayed. Set to false when the state is unchanged from the last time
 * that intervention appeared in the history.
 */
type HistoryLineWithChange = HistoryLine & { showState?: boolean };

interface DisplayHistoryLine extends HistoryLineWithChange {
  displayState: string;
}

interface HistoryTransaction extends Omit<HistoryLine, 'interventionName' | 'interventionState'> {
  tagId: string;
  sentAtFormatted: string;
  interventionEvents: DisplayHistoryLine[];
}

/**
 * Annotates each history line with `showState`, indicating whether the intervention's
 * state should be displayed. The state is shown only when the intervention transitions
 * to or from the ACTIVE state, relative to the last time that intervention appeared in
 * the history.
 *
 * Lines are processed in chronological order (oldest first), and each intervention's
 * most recently seen state is tracked independently. An event's state is shown when the
 * intervention becomes ACTIVE (its previous appearance was not ACTIVE, or this is its
 * first appearance) or stops being ACTIVE (its previous appearance was ACTIVE). Changes
 * between two non-ACTIVE states, and repeats of the same ACTIVE/non-ACTIVE status, are
 * hidden — even if the last appearance was not the immediately previous history event.
 */
export function flagInterventionStateChanges(history: AccountHistory): { lines: HistoryLineWithChange[] } {
  const lastStateByIntervention = new Map<InterventionName, InterventionState>();

  const lines = history.lines
    .toSorted((a, b) => a.sentAt - b.sentAt)
    .map((line) => {
      const lastState = lastStateByIntervention.get(line.interventionName);
      lastStateByIntervention.set(line.interventionName, line.interventionState);

      const wasActive = lastState === InterventionState.ACTIVE;
      const isActive = line.interventionState === InterventionState.ACTIVE;

      return { ...line, showState: wasActive !== isActive };
    });

  return { lines };
}

export function getDisplayState(line: HistoryLine): string {
  if (
    line.interventionState === InterventionState.MITIGATED &&
    line.interventionName !== InterventionName.TEMPORARY_SUSPENSION &&
    line.interventionName !== InterventionName.PERMANENT_SUSPENSION
  ) {
    return 'COMPLETED';
  }
  if (
    line.interventionState === InterventionState.REMOVED &&
    (line.interventionName === InterventionName.TEMPORARY_SUSPENSION ||
      line.interventionName === InterventionName.PERMANENT_SUSPENSION)
  ) {
    return 'UNSUSPENDED';
  }
  return line.interventionState;
}

export const formatHistory = (history: { lines: HistoryLineWithChange[] }): HistoryTransaction[] =>
  Object.values(
    history.lines.reduce<Record<string, HistoryTransaction>>((result, line) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { interventionName, interventionState, showState, ...rest } = line;

      result[line.tagId] = {
        ...rest,
        sentAtFormatted: formatDate(line.sentAt),
        interventionEvents: [
          ...(result[line.tagId]?.interventionEvents ?? []),
          { ...line, displayState: getDisplayState(line) },
        ],
      };
      return result;
    }, {}),
  ).toSorted((a, b) => b.sentAt - a.sentAt);
