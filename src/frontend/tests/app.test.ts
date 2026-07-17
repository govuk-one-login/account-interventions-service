import { init } from '../app';
import { InterventionStub, InterventionName, InterventionState } from '@govuk-one-login/ais-status-sdk';
import { StubMessageService } from '../../services/message-service';
import type { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import { FeatureFlagsStub } from '../../services/feature-flags';

describe('frontend app', () => {
  it('returns 200 for GET /', async () => {
    const server = init(new InterventionStub({ result: { interventions: [] } }));
    const response = await server.inject({ method: 'GET', url: '/' });
    expect(response.statusCode).toBe(200);
  });

  it('returns HTML containing the page heading', async () => {
    const server = init(new InterventionStub({ result: { interventions: [] } }));
    const response = await server.inject({ method: 'GET', url: '/' });
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.body).toContain('Account Interventions Service');
  });

  it('returns 404 for unknown routes', async () => {
    const server = init(new InterventionStub({ result: { interventions: [] } }));
    const response = await server.inject({ method: 'GET', url: '/unknown' });
    expect(response.statusCode).toBe(404);
  });

  describe('POST /search', () => {
    it('redirects to /user/:userId with status 303', async () => {
      const server = init(new InterventionStub({ result: { interventions: [] } }));
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
      const server = init(new InterventionStub({ result: { interventions: [] } }));
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

    it('redirects to /user/ when userId is missing from the body', async () => {
      const server = init(new InterventionStub({ result: { interventions: [] } }));
      const response = await server.inject({
        method: 'POST',
        url: '/search',
        payload: '',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(303);
      expect(response.headers.location).toBe('/user/');
    });
  });

  describe('GET /user/:userId', () => {
    it('returns 200 and renders the details page when user is found', async () => {
      const server = init(new InterventionStub({ result: { interventions: [] }, historyResult: { history: [] } }));
      const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
      expect(response.body).toContain('Account Status');
    });

    it('renders the history when user is found', async () => {
      const server = init(
        new InterventionStub({
          result: { interventions: [] },
          historyResult: {
            history: [
              {
                sentAt: 1784021279000,
                componentId: 'TEST',
                interventionName: InterventionName.TEMPORARY_SUSPENSION,
                interventionState: InterventionState.ACTIVE,
                interventionReason: 'Reason',
                interventionCode: '01',
                originatingComponent: 'TICF',
                requesterId: 'interventions@digital.cabinet-office.gov.uk',
              },
            ],
          },
        }),
      );
      const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
      expect(response.body).toContain('Account Status');
    });

    it('displays active interventions when the account has them', async () => {
      const server = init(
        new InterventionStub({
          interventionNames: [InterventionName.PERMANENT_SUSPENSION],
          historyResult: { history: [] },
        }),
      );
      const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('PERMANENT_SUSPENSION');
    });

    it('displays a no interventions message when the account exists but has no interventions', async () => {
      const server = init(new InterventionStub({ result: { interventions: [] }, historyResult: { history: [] } }));
      const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('There are no active interventions on this account.');
      expect(response.body).not.toContain('No account found for this identifier.');
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

      const server = init(mockClient);
      await server.inject({ method: 'GET', url: `/user/${encodeURIComponent(userId)}` });
      expect(queriedUserId).toBe(userId);
    });

    it('returns 400 for missing :userId', async () => {
      const server = init(new InterventionStub({ result: { interventions: [] } }));
      const response = await server.inject({ method: 'GET', url: '/user/%20' });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /send', () => {
    const successOutput: SendMessageCommandOutput = { $metadata: { httpStatusCode: 200 }, MessageId: 'msg-1' };

    it('redirects to /user/:userId with status 303', async () => {
      const server = init(
        new InterventionStub({ result: { interventions: [] } }),
        new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        new StubMessageService(successOutput),
      );
      const response = await server.inject({
        method: 'POST',
        url: '/send',
        payload: 'userId=test-user-id',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(303);
      expect(response.headers.location).toBe('/user/test-user-id');
    });

    it('URL-encodes the userId in the redirect location', async () => {
      const userId = 'urn:fdc:gov.uk:2022:abc123';
      const server = init(
        new InterventionStub({ result: { interventions: [] } }),
        new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        new StubMessageService(successOutput),
      );
      const response = await server.inject({
        method: 'POST',
        url: '/send',
        payload: `userId=${encodeURIComponent(userId)}`,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(303);
      expect(response.headers.location).toBe(`/user/${encodeURIComponent(userId)}`);
    });

    it('calls sendMessage with the correct userId', async () => {
      const messageService = new StubMessageService(successOutput);
      const sendMessageSpy = vi.spyOn(messageService, 'sendMessage');

      const server = init(
        new InterventionStub({ result: { interventions: [] } }),
        new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        messageService,
      );
      await server.inject({
        method: 'POST',
        url: '/send',
        payload: 'userId=test-user-id',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });

      expect(sendMessageSpy).toHaveBeenCalledOnce();
      expect(sendMessageSpy).toHaveBeenCalledWith(expect.objectContaining({ user: { user_id: 'test-user-id' } }));
    });

    it('sets the flash_message_sent cookie on the redirect response', async () => {
      const server = init(
        new InterventionStub({ result: { interventions: [] } }),
        new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        new StubMessageService(successOutput),
      );
      const response = await server.inject({
        method: 'POST',
        url: '/send',
        payload: 'userId=test-user-id',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });

      // eslint-disable-next-line unicorn/no-non-function-verb-prefix
      const setCookie = response.headers['set-cookie'];
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
      expect(cookies.some((c) => c.startsWith('flash_message_sent=true'))).toBe(true);
    });

    it('shows the success banner on the subsequent GET and not on a second GET', async () => {
      const server = init(
        new InterventionStub({ result: { interventions: [] }, historyResult: { history: [] } }),
        new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        new StubMessageService(successOutput),
      );

      // POST to /send — capture the flash cookie
      const postResponse = await server.inject({
        method: 'POST',
        url: '/send',
        payload: 'userId=test-user-id',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });

      // eslint-disable-next-line unicorn/no-non-function-verb-prefix
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
      const server = init(
        new InterventionStub({ result: { interventions: [] } }),
        new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
        new StubMessageService(),
      );
      const response = await server.inject({
        method: 'POST',
        url: '/send',
        payload: 'userId=test-user-id',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(500);
    });
  });
});
