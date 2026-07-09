import { init } from '../app';
import { InterventionStub, InterventionName } from '@govuk-one-login/ais-status-sdk';
import { InterventionStubV1 } from '../intervention-client-v1';
import { getCurrentTimestamp } from '../../commons/get-current-timestamp';
import { AISInterventionTypes } from '../../data-types/constants';

const emptyInterventionStub = new InterventionStub({ result: { interventions: [] } });
const baseInterventionV1Stub = new InterventionStubV1({
  intervention: {
    updatedAt: getCurrentTimestamp().milliseconds,
    appliedAt: getCurrentTimestamp().milliseconds,
    sentAt: getCurrentTimestamp().milliseconds,
    description: AISInterventionTypes.AIS_NO_INTERVENTION,
  },
  state: {
    blocked: false,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
  },
  auditLevel: 'standard',
  history: [
    {
      sentAt: '2026-06-10T13:39:18.648Z',
      component: 'TEST_EATL',
      code: '01',
      intervention: 'FRAUD_SUSPEND_ACCOUNT',
      reason: '03',
      originatingComponent: 'TEST_EATL',
      requesterId: 'edward.louth@digital.cabinet-office.gov.uk',
    },
    {
      sentAt: '2026-06-10T13:42:38.889Z',
      component: 'TEST_EATL',
      code: '02',
      intervention: 'FRAUD_UNSUSPEND_ACCOUNT',
      reason: '03',
      originatingComponent: 'TEST_EATL',
      requesterId: 'edward.louth@digital.cabinet-office.gov.uk',
    },
    {
      sentAt: '2026-06-10T13:43:12.624Z',
      component: 'TEST_EATL',
      code: '06',
      intervention: 'FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION',
      reason: '03',
      originatingComponent: 'TEST_EATL',
      requesterId: 'edward.louth@digital.cabinet-office.gov.uk',
    },
    {
      sentAt: '2026-06-10T13:44:17.172Z',
      component: 'TEST_EATL',
      code: '06',
      intervention: 'FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION',
      reason: '03',
      originatingComponent: 'TEST_EATL',
      requesterId: 'edward.louth@digital.cabinet-office.gov.uk',
    },
  ],
});

describe('frontend app', () => {
  it('returns 200 for GET /', async () => {
    const server = init(emptyInterventionStub, baseInterventionV1Stub);
    const response = await server.inject({ method: 'GET', url: '/' });
    expect(response.statusCode).toBe(200);
  });

  it('returns HTML containing the page heading', async () => {
    const server = init(emptyInterventionStub, baseInterventionV1Stub);
    const response = await server.inject({ method: 'GET', url: '/' });
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.body).toContain('Account Interventions Service');
  });

  it('returns 404 for unknown routes', async () => {
    const server = init(emptyInterventionStub, baseInterventionV1Stub);
    const response = await server.inject({ method: 'GET', url: '/unknown' });
    expect(response.statusCode).toBe(404);
  });

  describe('POST /search', () => {
    it('redirects to /user/:userId with status 303', async () => {
      const server = init(emptyInterventionStub, baseInterventionV1Stub);
      const response = await server.inject({
        method: 'POST',
        url: '/search',
        payload: 'userId=test-user-id',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(303);
      expect(response.headers.location).toBe('/main/user/test-user-id');
    });

    it('URL-encodes the userId in the redirect location', async () => {
      const server = init(emptyInterventionStub, baseInterventionV1Stub);
      const userId = 'urn:fdc:gov.uk:2022:abc123';
      const response = await server.inject({
        method: 'POST',
        url: '/search',
        payload: `userId=${encodeURIComponent(userId)}`,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(303);
      expect(response.headers.location).toBe(`/main/user/${encodeURIComponent(userId)}`);
    });

    it('redirects to /user/ when userId is missing from the body', async () => {
      const server = init(emptyInterventionStub, baseInterventionV1Stub);
      const response = await server.inject({
        method: 'POST',
        url: '/search',
        payload: '',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(303);
      expect(response.headers.location).toBe('/main/user/');
    });
  });

  describe('GET /user/:userId', () => {
    it('returns 200 and renders the details page when user is found', async () => {
      const server = init(emptyInterventionStub, baseInterventionV1Stub);
      const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
      expect(response.body).toContain('Account Status');
    });

    it('displays active interventions when the account has them', async () => {
      const server = init(
        new InterventionStub({ interventionNames: [InterventionName.PERMANENT_SUSPENSION] }),
        baseInterventionV1Stub,
      );
      const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('PERMANENT_SUSPENSION');
    });

    it('displays a no interventions message when the account exists but has no interventions', async () => {
      const server = init(emptyInterventionStub, baseInterventionV1Stub);
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
      };

      const server = init(mockClient, baseInterventionV1Stub);
      await server.inject({ method: 'GET', url: `/user/${encodeURIComponent(userId)}` });
      expect(queriedUserId).toBe(userId);
    });

    it('returns 400 for missing :userId', async () => {
      const server = init(new InterventionStub({ result: { interventions: [] } }));
      const response = await server.inject({ method: 'GET', url: '/user/%20' });
      expect(response.statusCode).toBe(400);
    });

    it('formats ISO date strings in history sentAt fields into human-readable UK dates', async () => {
      const server = init(emptyInterventionStub, baseInterventionV1Stub);
      const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(response.statusCode).toBe(200);
      // baseInterventionV1Stub contains sentAt '2026-06-10T13:39:18.648Z'
      // formatDate renders using the local timezone, so derive expected values the same way
      const isoString = '2026-06-10T13:39:18.648Z';
      const date = new Date(isoString);
      const expectedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const expectedTime = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      expect(response.body).toContain(expectedDate);
      expect(response.body).toContain(expectedTime);
    });

    it('renders the page without a history table when history is absent from the V1 response', async () => {
      const noHistoryStub = new InterventionStubV1({
        intervention: {
          updatedAt: getCurrentTimestamp().milliseconds,
          appliedAt: getCurrentTimestamp().milliseconds,
          sentAt: getCurrentTimestamp().milliseconds,
          description: AISInterventionTypes.AIS_NO_INTERVENTION,
        },
        state: { blocked: false, suspended: false, resetPassword: false, reproveIdentity: false },
        auditLevel: 'standard',
        // no history field
      });

      const server = init(emptyInterventionStub, noHistoryStub);
      const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(response.statusCode).toBe(200);
    });

    it('returns 500 when the intervention client throws', async () => {
      const failingClient = {
        getAccountStatus: () => Promise.reject(new Error('upstream failure')),
      };

      const server = init(failingClient, baseInterventionV1Stub);
      const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(response.statusCode).toBe(500);
    });

    it('returns 500 when the V1 client throws', async () => {
      const failingV1Client = {
        getAccountHistory: () => Promise.reject(new Error('V1 upstream failure')),
      };

      const server = init(emptyInterventionStub, failingV1Client);
      const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });
      expect(response.statusCode).toBe(500);
    });

    it('passes the decoded userId to the V1 client', async () => {
      const userId = 'urn:fdc:gov.uk:2022:xyz789';
      let queriedUserIdV1: string | undefined;

      const mockV1Client = {
        getAccountHistory: (id: string) => {
          queriedUserIdV1 = id;
          return Promise.resolve(baseInterventionV1Stub.output);
        },
      };

      const server = init(emptyInterventionStub, mockV1Client);
      await server.inject({ method: 'GET', url: `/user/${encodeURIComponent(userId)}` });
      expect(queriedUserIdV1).toBe(userId);
    });
  });

  describe('STAGE_PREFIX', () => {
    it('prefixes the redirect location with STAGE_PREFIX when set', async () => {
      const server = init(emptyInterventionStub, baseInterventionV1Stub);
      const response = await server.inject({
        method: 'POST',
        url: '/search',
        payload: 'userId=test-user',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(303);
      expect(response.headers.location).toBe('/main/user/test-user');
    });
  });

  describe('POST /search — userId trimming', () => {
    it('trims leading and trailing whitespace from userId before redirecting', async () => {
      const server = init(emptyInterventionStub, baseInterventionV1Stub);
      const response = await server.inject({
        method: 'POST',
        url: '/search',
        payload: `userId=${encodeURIComponent('  spaced-user  ')}`,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.statusCode).toBe(303);
      expect(response.headers.location).toBe('/main/user/spaced-user');
    });
  });
});
