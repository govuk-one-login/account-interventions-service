import {
  formatHistory,
  init,
  generateVerifyRequest,
  getDisplayState,
  flagInterventionStateChanges,
  redirectHook,
  markHistoryUncertainty,
  getUncertaintyCutoff,
  type FrontendAppConfig,
  type FrontendAppDependencies,
} from '../app.mts';

import { InterventionStub, InterventionName, InterventionState } from '@govuk-one-login/ais-status-sdk';
import { StubMessageService } from '../../services/message-service.mts';
import type { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import { FeatureFlagsStub } from '../../services/feature-flags';
import { JwtAuthoriser, StubAuthoriser } from '../authoriser';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { FaiJwtPayload, JwtVerifierInterface } from '../../services/jwt-verifier';
import { Role } from '../../services/jwt-verifier';

vi.mock('@aws-lambda-powertools/logger');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal FastifyRequest-shaped object with awsLambda populated,
 * as it would be in a real Lambda invocation via \@fastify/aws-lambda.
 */
const makeRequest = (options: { jwt?: string; url?: string } = {}): FastifyRequest =>
  ({
    url: options.url ?? '/test',
    awsLambda: {
      event: {
        requestContext: {
          authorizer: options.jwt ? { jwt: options.jwt } : {},
        },
      },
      context: {},
    },
  }) as unknown as FastifyRequest;

const makeReply = (): FastifyReply =>
  ({
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  }) as unknown as FastifyReply;

const makeRedirectRequest = (authorizer: Record<string, unknown> = {}): FastifyRequest =>
  ({
    url: '/test',
    awsLambda: {
      event: {
        requestContext: { authorizer },
      },
      context: {},
    },
  }) as unknown as FastifyRequest;

const makeRedirectReply = () =>
  ({
    status: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  }) as unknown as FastifyReply;

interface ValidationErrorBody {
  error: string;
  message: string;
}

const makeLine = (
  interventionName: InterventionName,
  interventionState: InterventionState,
  sentAt = 1784021279000,
  tagId = 'tag1',
) => ({
  sentAt,
  componentId: 'TEST',
  interventionName,
  interventionState,
  interventionReason: 'Reason',
  tagId,
});

const showStateByOrder = (history: { lines: { sentAt: number; showState?: boolean }[] }) =>
  history.lines.map((l) => ({ sentAt: l.sentAt, showState: l.showState }));

// ---------------------------------------------------------------------------
// generateVerifyRequest — unit tests (tests the exported hook factory directly)
// ---------------------------------------------------------------------------

function makeAuthoriser() {
  const verifyMock = vi.fn<(token: string) => Promise<FaiJwtPayload>>();
  const stubVerifier: JwtVerifierInterface = { verify: verifyMock };
  const authoriser = new JwtAuthoriser(stubVerifier);
  return { verifyMock, authoriser };
}

describe('generateVerifyRequest', () => {
  it('calls reply.status(401) when the JWT is missing', async () => {
    const { verifyMock, authoriser } = makeAuthoriser();
    verifyMock.mockResolvedValue({ sub: 'u', email: 'u@e.com', roles: [Role.STANDARD_USER], iat: 0, exp: 9999999999 });
    const hook = generateVerifyRequest(authoriser);
    const request = makeRequest(); // no jwt
    const reply = makeReply();

    await hook(request, reply);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('does not call reply.status when the JWT verifies successfully', async () => {
    const { verifyMock, authoriser } = makeAuthoriser();
    verifyMock.mockResolvedValue({ sub: 'u', email: 'u@e.com', roles: [Role.STANDARD_USER], iat: 0, exp: 9999999999 });
    const hook = generateVerifyRequest(authoriser);
    const request = makeRequest({ jwt: 'valid.token.here' });
    const reply = makeReply();

    await hook(request, reply);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('passes the authorizer context and url from the request to authoriser.verify', async () => {
    const { authoriser } = makeAuthoriser();
    const verifySpy = vi.spyOn(authoriser, 'verify').mockResolvedValue({ success: true, payload: {} });
    const hook = generateVerifyRequest(authoriser);
    const request = makeRequest({ jwt: 'my.token', url: '/some/path' });
    const reply = makeReply();

    await hook(request, reply);

    expect(verifySpy).toHaveBeenCalledWith({ jwt: 'my.token' }, '/some/path');
  });

  it('calls reply.status(401) when verification fails', async () => {
    const { verifyMock, authoriser } = makeAuthoriser();
    verifyMock.mockRejectedValue(new Error('bad token'));
    const hook = generateVerifyRequest(authoriser);
    const request = makeRequest({ jwt: 'bad.token' });
    const reply = makeReply();

    await hook(request, reply);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.status).toHaveBeenCalledWith(401);
  });
});

// ---------------------------------------------------------------------------
// redirectHook — unit tests (tests the exported hook factory directly)
// ---------------------------------------------------------------------------

describe('redirectHook', () => {
  it('returns a 302 redirect when the authorizer context signals a redirect', async () => {
    const request = makeRedirectRequest({
      redirect: 'true',
      redirectUrl: 'https://example.com/redirect',
      authCookie: 'session=xyz; Path=/',
    });
    const reply = makeRedirectReply();

    await redirectHook(request, reply);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.status).toHaveBeenCalledWith(302);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.header).toHaveBeenCalledWith('location', 'https://example.com/redirect');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.header).toHaveBeenCalledWith('set-cookie', 'session=xyz; Path=/');
  });

  it('does not send a response when the authorizer context is not a redirect', async () => {
    const request = makeRedirectRequest({});
    const reply = makeRedirectReply();

    await redirectHook(request, reply);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.status).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Helper: init the server with a StubAuthoriser and a stub awsLambda decoration
// so server.inject() requests satisfy the onRequest hook without a real Lambda event.
// ---------------------------------------------------------------------------

function initWithStubAuth(dependencies: FrontendAppDependencies, config: FrontendAppConfig) {
  const server = init(dependencies, config);
  server.decorateRequest('awsLambda', {
    getter: () =>
      ({ event: { requestContext: { authorizer: {} } }, context: {} }) as {
        event: APIGatewayProxyEvent;
        context: Context;
      },
  });
  return server;
}

describe('frontend app', () => {
  it('returns 200 for GET /', async () => {
    const server = initWithStubAuth(
      {
        interventionClient: new InterventionStub({ result: { interventions: [] } }),
        messageService: new StubMessageService(),
        authoriser: new StubAuthoriser(),
        config: {},
      },
      {
        featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
      },
    );
    const response = await server.inject({ method: 'GET', url: '/' });
    expect(response.statusCode).toBe(200);
  });

  it('returns HTML containing the page heading', async () => {
    const server = initWithStubAuth(
      {
        interventionClient: new InterventionStub({ result: { interventions: [] } }),
        messageService: new StubMessageService(),
        authoriser: new StubAuthoriser(),
        config: {},
      },
      {
        featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
      },
    );
    const response = await server.inject({ method: 'GET', url: '/' });
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.body).toContain('Account Interventions Service');
  });

  it('returns 404 for unknown routes', async () => {
    const server = initWithStubAuth(
      {
        interventionClient: new InterventionStub({ result: { interventions: [] } }),
        messageService: new StubMessageService(),
        authoriser: new StubAuthoriser(),
        config: {},
      },
      {
        featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
      },
    );
    const response = await server.inject({ method: 'GET', url: '/unknown' });
    expect(response.statusCode).toBe(404);
  });

  describe('POST /search', () => {
    it('redirects to /user/:userId with status 303', async () => {
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({ result: { interventions: [] } }),
          messageService: new StubMessageService(),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      const response = await server.inject({
        method: 'POST',
        url: '/search',
        payload: 'userId=test-user-id',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(303);
      expect(response.headers.location).toBe('/user/test-user-id');
    });

    it('URL-encodes the userId in the redirect location', async () => {
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({ result: { interventions: [] } }),
          messageService: new StubMessageService(),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      const userId = 'urn:fdc:gov.uk:2022:abc123';
      const response = await server.inject({
        method: 'POST',
        url: '/search',
        payload: `userId=${encodeURIComponent(userId)}`,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(303);
      expect(response.headers.location).toBe(`/user/${encodeURIComponent(userId)}`);
    });
  });

  describe('GET /user/:userId', () => {
    it('returns 200 and renders the details page when user is found', async () => {
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({ result: { interventions: [] }, historyResult: { lines: [] } }),
          messageService: new StubMessageService(),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
      expect(response.body).toContain('Account Status');
    });

    it('renders the history when user is found', async () => {
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({
            result: { interventions: [] },
            historyResult: {
              lines: [
                {
                  sentAt: 1784021279000,
                  componentId: 'TEST',
                  interventionName: InterventionName.TEMPORARY_SUSPENSION,
                  interventionState: InterventionState.ACTIVE,
                  interventionReason: 'Reason',
                  interventionCode: '01',
                  originatingComponentId: 'TICF',
                  requesterId: 'interventions@digital.cabinet-office.gov.uk',
                  tagId: 'abc1234',
                },
              ],
            },
          }),
          messageService: new StubMessageService(),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
      expect(response.body).toContain('Account Status');
    });

    it('displays active interventions when the account has them', async () => {
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({
            interventionNames: [InterventionName.PERMANENT_SUSPENSION],
            historyResult: { lines: [] },
          }),
          messageService: new StubMessageService(),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('PERMANENT SUSPENSION');
    });

    it('displays a no interventions message when the account exists but has no interventions', async () => {
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({ result: { interventions: [] }, historyResult: { lines: [] } }),
          messageService: new StubMessageService(),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('User not found');
    });

    it('URL-decodes the userId path parameter before querying', async () => {
      const userId = 'urn:fdc:gov.uk:2022:abc123';
      let queriedUserId: string | undefined;

      const mockClient = {
        getAccountStatus: (id: string) => {
          queriedUserId = id;
          return Promise.resolve({ interventions: [] });
        },
        getAccountHistory: () => Promise.reject(new Error('Blah')),
      };

      const server = initWithStubAuth(
        {
          interventionClient: mockClient,
          messageService: new StubMessageService(),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      await server.inject({ method: 'GET', url: `/user/${encodeURIComponent(userId)}` });
      expect(queriedUserId).toBe(userId);
    });

    it('returns 400 for missing :userId', async () => {
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({ result: { interventions: [] } }),
          messageService: new StubMessageService(),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      const response = await server.inject({ method: 'GET', url: '/user/%20' });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /send', () => {
    const successOutput: SendMessageCommandOutput = { $metadata: { httpStatusCode: 200 }, MessageId: 'msg-1' };

    it('redirects to /user/:userId with status 303', async () => {
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({ result: { interventions: [] } }),
          messageService: new StubMessageService(successOutput),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      const response = await server.inject({
        method: 'POST',
        url: '/send',
        payload: 'userId=test-user-id&interventionCode=01',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(303);
      expect(response.headers.location).toBe('/user/test-user-id');
    });

    it('URL-encodes the userId in the redirect location', async () => {
      const userId = 'urn:fdc:gov.uk:2022:abc123';
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({ result: { interventions: [] } }),
          messageService: new StubMessageService(successOutput),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      const response = await server.inject({
        method: 'POST',
        url: '/send',
        payload: `userId=${encodeURIComponent(userId)}&interventionCode=01`,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(303);
      expect(response.headers.location).toBe(`/user/${encodeURIComponent(userId)}`);
    });

    it('calls sendMessage with the correct userId', async () => {
      const messageService = new StubMessageService(successOutput);
      const sendMessageSpy = vi.spyOn(messageService, 'sendMessage');

      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({ result: { interventions: [] } }),
          messageService,
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      await server.inject({
        method: 'POST',
        url: '/send',
        payload: 'userId=test-user-id&interventionCode=01',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });

      expect(sendMessageSpy).toHaveBeenCalledOnce();
      expect(sendMessageSpy).toHaveBeenCalledWith(expect.objectContaining({ user: { user_id: 'test-user-id' } }));
    });

    it('sets the flash_message_sent cookie on the redirect response', async () => {
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({ result: { interventions: [] } }),
          messageService: new StubMessageService(successOutput),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      const response = await server.inject({
        method: 'POST',
        url: '/send',
        payload: 'userId=test-user-id&interventionCode=01',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });

      const setCookie = response.headers['set-cookie'];
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
      expect(cookies.some((c) => c.startsWith('flash_message_sent=true'))).toBe(true);
    });

    it('shows the success banner on the subsequent GET and not on a second GET', async () => {
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({ result: { interventions: [] }, historyResult: { lines: [] } }),
          messageService: new StubMessageService(successOutput),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );

      // POST to /send — capture the flash cookie
      const postResponse = await server.inject({
        method: 'POST',
        url: '/send',
        payload: 'userId=test-user-id&interventionCode=01',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });

      const setCookieHeader = postResponse.headers['set-cookie'] as string;
      const cookieValue = setCookieHeader.split(';', 1)[0]; // e.g. "flash_message_sent=true"

      // First GET — banner should appear
      const firstGet = await server.inject({
        method: 'GET',
        url: '/user/test-user-id',
        headers: { cookie: cookieValue },
      });
      expect(firstGet.body).toContain('TxMA message sent');

      // Second GET without cookie — banner should not appear
      const secondGet = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(secondGet.body).not.toContain('TxMA message sent');
    });

    it('returns 500 when sendMessage rejects', async () => {
      // MessageStub with no successOutput will reject sendMessage
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({ result: { interventions: [] } }),
          messageService: new StubMessageService(),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      const response = await server.inject({
        method: 'POST',
        url: '/send',
        payload: 'userId=test-user-id&interventionCode=01',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(500);
    });

    it('returns 422 with a helpful message when userId is missing', async () => {
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({ result: { interventions: [] } }),
          messageService: new StubMessageService(successOutput),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      const response = await server.inject({
        method: 'POST',
        url: '/send',
        payload: 'interventionCode=01',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ValidationErrorBody;
      expect(body.error).toBe('Missing userId');
      expect(body.message).toContain('user ID is required');
    });

    it('returns 422 with a helpful message when interventionCode is missing', async () => {
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({ result: { interventions: [] } }),
          messageService: new StubMessageService(successOutput),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      const response = await server.inject({
        method: 'POST',
        url: '/send',
        payload: 'userId=test-user-id',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ValidationErrorBody;
      expect(body.error).toBe('Missing interventionCode');
      expect(body.message).toContain('intervention code is required');
    });

    it('returns 422 with a helpful message when interventionCode is not recognised', async () => {
      const server = initWithStubAuth(
        {
          interventionClient: new InterventionStub({ result: { interventions: [] } }),
          messageService: new StubMessageService(successOutput),
          authoriser: new StubAuthoriser(),
          config: {},
        },
        {
          featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        },
      );
      const response = await server.inject({
        method: 'POST',
        url: '/send',
        payload: 'userId=test-user-id&interventionCode=INVALID',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ValidationErrorBody;
      expect(body.error).toBe('Invalid interventionCode');
      expect(body.message).toContain('INVALID');
      expect(body.message).toContain('not a recognised intervention code');
    });
  });
});

describe('submitted without a URN', () => {
  it('redirects back to home page when userId is missing from the body', async () => {
    const server = initWithStubAuth(
      {
        interventionClient: new InterventionStub({ result: { interventions: [] } }),
        messageService: new StubMessageService(),
        authoriser: new StubAuthoriser(),
        config: {},
      },
      {
        featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
      },
    );
    const response = await server.inject({
      method: 'POST',
      url: '/search',
      payload: '',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toBe('/');
    expect(response.headers['set-cookie']).toContain('flash_search_error=true');
  });

  it('redirects back to home page when userId is missing from the body and SUBPATH/STAGE_PREFIX are set', async () => {
    const server = initWithStubAuth(
      {
        interventionClient: new InterventionStub({ result: { interventions: [] } }),
        messageService: new StubMessageService(),
        authoriser: new StubAuthoriser(),
        config: {
          subpath: '/interventions',
          stagePrefix: '/v1',
        },
      },
      {
        featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
      },
    );
    const response = await server.inject({
      method: 'POST',
      url: '/search',
      payload: '',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toBe('/interventions/v1/');
    expect(response.headers['set-cookie']).toContain('flash_search_error=true');
  });

  it('shows the error on the first GET with the flash cookie and not on a second GET', async () => {
    const server = initWithStubAuth(
      {
        interventionClient: new InterventionStub({ result: { interventions: [] } }),
        messageService: new StubMessageService(),
        authoriser: new StubAuthoriser(),
        config: {},
      },
      {
        featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
      },
    );

    // POST to /search with empty userId — capture the flash cookie
    const postResponse = await server.inject({
      method: 'POST',
      url: '/search',
      payload: '',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });

    const setCookieHeader = postResponse.headers['set-cookie'] as string;
    const cookieValue = setCookieHeader.split(';', 1)[0]; // e.g. "flash_search_error=true"

    // First GET with cookie — error should appear
    const firstGet = await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie: cookieValue },
    });
    expect(firstGet.body).toContain('Enter a valid subject identifier.');

    // Second GET without cookie — error should not appear
    const secondGet = await server.inject({ method: 'GET', url: '/' });
    expect(secondGet.body).not.toContain('Enter a valid subject identifier.');
  });
});

describe('formatHistory', () => {
  it('sorts history objects by most recent first', () => {
    const result = formatHistory({
      lines: [
        {
          sentAt: 1784021279020,
          componentId: 'TEST',
          interventionName: InterventionName.RESET_PASSWORD,
          interventionState: InterventionState.ACTIVE,
          interventionReason: 'Reason',
          interventionCode: '04',
          originatingComponentId: 'TICF',
          requesterId: 'interventions@digital.cabinet-office.gov.uk',
          tagId: 'abc1236',
        },
        {
          sentAt: 1784021279000,
          componentId: 'TEST',
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.ACTIVE,
          interventionReason: 'Reason',
          interventionCode: '01',
          originatingComponentId: 'TICF',
          requesterId: 'interventions@digital.cabinet-office.gov.uk',
          tagId: 'abc1234',
        },
        {
          sentAt: 1784021279010,
          componentId: 'TEST',
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.REMOVED,
          interventionReason: 'Reason',
          interventionCode: '02',
          originatingComponentId: 'TICF',
          requesterId: 'interventions@digital.cabinet-office.gov.uk',
          tagId: 'abc1235',
        },
      ],
    });

    expect(result[0]?.sentAt).toEqual(1784021279020);
    expect(result[1]?.sentAt).toEqual(1784021279010);
    expect(result[2]?.sentAt).toEqual(1784021279000);
  });

  it('groups history objects with same tagId', () => {
    const result = formatHistory({
      lines: [
        {
          sentAt: 1784021279000,
          componentId: 'TEST',
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.ACTIVE,
          interventionReason: 'Reason',
          interventionCode: '01',
          originatingComponentId: 'TICF',
          requesterId: 'interventions@digital.cabinet-office.gov.uk',
          tagId: 'abc1234',
        },
        {
          sentAt: 1784021279020,
          componentId: 'TEST',
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.REMOVED,
          interventionReason: 'Reason',
          interventionCode: '04',
          originatingComponentId: 'TICF',
          requesterId: 'interventions@digital.cabinet-office.gov.uk',
          tagId: 'abc1235',
        },
        {
          sentAt: 1784021279020,
          componentId: 'TEST',
          interventionName: InterventionName.RESET_PASSWORD,
          interventionState: InterventionState.ACTIVE,
          interventionReason: 'Reason',
          interventionCode: '04',
          originatingComponentId: 'TICF',
          requesterId: 'interventions@digital.cabinet-office.gov.uk',
          tagId: 'abc1235',
        },
      ],
    });

    expect(result).toEqual([
      {
        componentId: 'TEST',
        interventionCode: '04',
        interventionEvents: [
          {
            componentId: 'TEST',
            interventionCode: '04',
            interventionName: 'TEMPORARY_SUSPENSION',
            interventionReason: 'Reason',
            interventionState: 'REMOVED',
            displayState: 'UNSUSPENDED',
            originatingComponentId: 'TICF',
            requesterId: 'interventions@digital.cabinet-office.gov.uk',
            sentAt: 1784021279020,
            tagId: 'abc1235',
          },
          {
            componentId: 'TEST',
            interventionCode: '04',
            interventionName: 'RESET_PASSWORD',
            interventionReason: 'Reason',
            interventionState: 'ACTIVE',
            displayState: 'ACTIVE',
            originatingComponentId: 'TICF',
            requesterId: 'interventions@digital.cabinet-office.gov.uk',
            sentAt: 1784021279020,
            tagId: 'abc1235',
          },
        ],
        interventionReason: 'Reason',
        originatingComponentId: 'TICF',
        requesterId: 'interventions@digital.cabinet-office.gov.uk',
        sentAt: 1784021279020,
        sentAtFormatted: '14 July 2026 at 09:27:59 UTC',
        tagId: 'abc1235',
      },
      {
        componentId: 'TEST',
        interventionCode: '01',
        interventionEvents: [
          {
            componentId: 'TEST',
            interventionCode: '01',
            interventionName: 'TEMPORARY_SUSPENSION',
            interventionReason: 'Reason',
            interventionState: 'ACTIVE',
            displayState: 'ACTIVE',
            originatingComponentId: 'TICF',
            requesterId: 'interventions@digital.cabinet-office.gov.uk',
            sentAt: 1784021279000,
            tagId: 'abc1234',
          },
        ],
        interventionReason: 'Reason',
        originatingComponentId: 'TICF',
        requesterId: 'interventions@digital.cabinet-office.gov.uk',
        sentAt: 1784021279000,
        sentAtFormatted: '14 July 2026 at 09:27:59 UTC',
        tagId: 'abc1234',
      },
    ]);
  });
});

describe('getUncertaintyCutoff', () => {
  const FIXED_CUTOFF = new Date(2026, 5, 10).valueOf(); // 10 July 2026

  it('returns the fixed cutoff when two years ago is earlier than the fixed cutoff', () => {
    // now = 10 July 2027 -> two years ago = 10 July 2025, which is before the fixed cutoff
    const now = new Date(2027, 5, 10);
    expect(getUncertaintyCutoff(now)).toEqual(FIXED_CUTOFF);
  });

  it('returns two years ago when it is more recent than the fixed cutoff', () => {
    // now = 10 July 2030 -> two years ago = 10 July 2028, which is after the fixed cutoff
    const now = new Date(2030, 6, 10);
    expect(getUncertaintyCutoff(now)).toEqual(new Date(2028, 6, 10).valueOf());
  });
});

describe('markHistoryUncertainty', () => {
  // Build type-safe HistoryTransaction objects via formatHistory
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const makeHistory = (sentAtValues: number[]) =>
    formatHistory({
      lines: sentAtValues.map((sentAt, i) => ({
        sentAt,
        componentId: 'TEST',
        interventionName: InterventionName.RESET_PASSWORD,
        interventionState: InterventionState.ACTIVE,
        interventionReason: 'Reason',
        interventionCode: '04',
        originatingComponentId: 'TICF',
        requesterId: 'interventions@digital.cabinet-office.gov.uk',
        tagId: `tag-${i.toString()}`,
      })),
    });

  const beforeFixedCutoff = new Date(2026, 5, 9).valueOf(); // 9 July 2026
  const afterFixedCutoff = new Date(2026, 5, 11).valueOf(); // 11 July 2026

  it('marks the first transaction that falls before the cutoff', () => {
    // now such that fixed cutoff (10 July 2026) is used
    const now = new Date(2027, 0, 1);
    const history = makeHistory([afterFixedCutoff, beforeFixedCutoff]);

    const result = markHistoryUncertainty(history, now);

    expect((result[0] as { cutoff?: true }).cutoff).toBeUndefined();
    expect((result[1] as { cutoff?: true }).cutoff).toBe(true);
  });

  it('does not mark any transaction when all are after the cutoff', () => {
    const now = new Date(2027, 0, 1);
    const history = makeHistory([afterFixedCutoff, new Date(2026, 7, 1).valueOf()]);

    const result = markHistoryUncertainty(history, now);

    expect(result.some((t) => (t as { cutoff?: true }).cutoff === true)).toBe(false);
  });

  it('uses the two-years-ago cutoff when it is more recent than the fixed cutoff', () => {
    // now = 1 Jan 2030 -> two years ago = 1 Jan 2028 (more recent than fixed cutoff)
    const now = new Date(2030, 0, 1);
    const beforeTwoYearsAgo = new Date(2027, 11, 31).valueOf(); // 31 Dec 2027
    const afterTwoYearsAgo = new Date(2028, 0, 2).valueOf(); // 2 Jan 2028
    const history = makeHistory([afterTwoYearsAgo, beforeTwoYearsAgo]);

    const result = markHistoryUncertainty(history, now);

    expect((result[0] as { cutoff?: true }).cutoff).toBeUndefined();
    expect((result[1] as { cutoff?: true }).cutoff).toBe(true);
  });

  it('only marks the first (most recent) transaction before the cutoff', () => {
    const now = new Date(2027, 0, 1);
    const history = makeHistory([afterFixedCutoff, beforeFixedCutoff, new Date(2026, 5, 1).valueOf()]);

    const result = markHistoryUncertainty(history, now);

    const markedCount = result.filter((t) => (t as { cutoff?: true }).cutoff === true).length;
    expect(markedCount).toBe(1);
    expect((result[1] as { cutoff?: true }).cutoff).toBe(true);
  });
});

describe('getDisplayState', () => {
  it('returns COMPLETED when RESET_PASSWORD is MITIGATED', () => {
    expect(getDisplayState(makeLine(InterventionName.RESET_PASSWORD, InterventionState.MITIGATED))).toBe('COMPLETED');
  });

  it('returns COMPLETED when REPROVE_IDENTITY is MITIGATED', () => {
    expect(getDisplayState(makeLine(InterventionName.REPROVE_IDENTITY, InterventionState.MITIGATED))).toBe('COMPLETED');
  });

  it('returns UNSUSPENDED when TEMPORARY_SUSPENSION is REMOVED', () => {
    expect(getDisplayState(makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.REMOVED))).toBe(
      'UNSUSPENDED',
    );
  });

  it('returns UNSUSPENDED when PERMANENT_SUSPENSION is REMOVED', () => {
    expect(getDisplayState(makeLine(InterventionName.PERMANENT_SUSPENSION, InterventionState.REMOVED))).toBe(
      'UNSUSPENDED',
    );
  });

  it('returns the original state when TEMPORARY_SUSPENSION is ACTIVE', () => {
    expect(getDisplayState(makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.ACTIVE))).toBe('ACTIVE');
  });

  it('returns the original state when RESET_PASSWORD is REMOVED', () => {
    expect(getDisplayState(makeLine(InterventionName.RESET_PASSWORD, InterventionState.REMOVED))).toBe('REMOVED');
  });

  it('returns the original state when TEMPORARY_SUSPENSION is SUPERSEDED', () => {
    expect(getDisplayState(makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.SUPERSEDED))).toBe(
      'SUPERSEDED',
    );
  });

  it('returns the original state when RESET_PASSWORD is ACTIVE', () => {
    expect(getDisplayState(makeLine(InterventionName.RESET_PASSWORD, InterventionState.ACTIVE))).toBe('ACTIVE');
  });
});

describe('flagInterventionStateChanges', () => {
  it('shows the state when an intervention first appears as ACTIVE (a change to ACTIVE)', () => {
    const result = flagInterventionStateChanges({
      lines: [makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.ACTIVE, 1000)],
    });

    expect(result.lines[0]?.showState).toBe(true);
  });

  it('hides the state when an intervention first appears as a non-ACTIVE state', () => {
    const result = flagInterventionStateChanges({
      lines: [makeLine(InterventionName.RESET_PASSWORD, InterventionState.REMOVED, 1000)],
    });

    expect(result.lines[0]?.showState).toBe(false);
  });

  it('shows the state when an intervention changes from a non-ACTIVE state to ACTIVE', () => {
    const result = flagInterventionStateChanges({
      lines: [
        makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.REMOVED, 1000),
        makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.ACTIVE, 2000),
      ],
    });

    expect(showStateByOrder(result)).toEqual([
      { sentAt: 1000, showState: false },
      { sentAt: 2000, showState: true },
    ]);
  });

  it('shows the state when an intervention changes from ACTIVE to a non-ACTIVE state', () => {
    const result = flagInterventionStateChanges({
      lines: [
        makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.ACTIVE, 1000),
        makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.REMOVED, 2000),
      ],
    });

    expect(showStateByOrder(result)).toEqual([
      { sentAt: 1000, showState: true },
      { sentAt: 2000, showState: true },
    ]);
  });

  it('hides the state when it stays ACTIVE', () => {
    const result = flagInterventionStateChanges({
      lines: [
        makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.ACTIVE, 1000),
        makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.ACTIVE, 2000),
      ],
    });

    expect(showStateByOrder(result)).toEqual([
      { sentAt: 1000, showState: true },
      { sentAt: 2000, showState: false },
    ]);
  });

  it('hides the state when it changes between two non-ACTIVE states', () => {
    const result = flagInterventionStateChanges({
      lines: [
        makeLine(InterventionName.RESET_PASSWORD, InterventionState.ACTIVE, 1000),
        makeLine(InterventionName.RESET_PASSWORD, InterventionState.MITIGATED, 2000),
        makeLine(InterventionName.RESET_PASSWORD, InterventionState.REMOVED, 3000),
      ],
    });

    // ACTIVE -> MITIGATED is a change from ACTIVE (shown); MITIGATED -> REMOVED does not
    // involve ACTIVE, so it is hidden even though the state changed.
    expect(showStateByOrder(result)).toEqual([
      { sentAt: 1000, showState: true },
      { sentAt: 2000, showState: true },
      { sentAt: 3000, showState: false },
    ]);
  });

  it('compares against the last appearance of the same intervention, even when another intervention appeared in between', () => {
    const result = flagInterventionStateChanges({
      lines: [
        makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.ACTIVE, 1000),
        makeLine(InterventionName.RESET_PASSWORD, InterventionState.ACTIVE, 2000),
        makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.ACTIVE, 3000),
      ],
    });

    // The TEMPORARY_SUSPENSION at 3000 was already ACTIVE at its previous appearance (1000),
    // so it is hidden even though the immediately previous event (RESET_PASSWORD) differed.
    expect(showStateByOrder(result)).toEqual([
      { sentAt: 1000, showState: true },
      { sentAt: 2000, showState: true },
      { sentAt: 3000, showState: false },
    ]);
  });

  it('tracks each intervention independently', () => {
    const result = flagInterventionStateChanges({
      lines: [
        makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.ACTIVE, 1000),
        makeLine(InterventionName.RESET_PASSWORD, InterventionState.ACTIVE, 2000),
        makeLine(InterventionName.RESET_PASSWORD, InterventionState.MITIGATED, 3000),
        makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.ACTIVE, 4000),
      ],
    });

    expect(showStateByOrder(result)).toEqual([
      { sentAt: 1000, showState: true },
      { sentAt: 2000, showState: true },
      { sentAt: 3000, showState: true },
      { sentAt: 4000, showState: false },
    ]);
  });

  it('processes lines in chronological order regardless of input order', () => {
    const result = flagInterventionStateChanges({
      lines: [
        makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.REMOVED, 3000),
        makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.ACTIVE, 1000),
        makeLine(InterventionName.TEMPORARY_SUSPENSION, InterventionState.ACTIVE, 2000),
      ],
    });

    expect(showStateByOrder(result)).toEqual([
      { sentAt: 1000, showState: true },
      { sentAt: 2000, showState: false },
      { sentAt: 3000, showState: true },
    ]);
  });
});
