import { FastifyRequest } from 'fastify';
import { JwtAuthoriser, StubAuthoriser } from '../authoriser';
import { type JwtVerifierInterface, type FaiJwtPayload, Role } from '../../services/jwt-verifier';
import logger from '../../commons/logger';

vi.mock('@aws-lambda-powertools/logger');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal FaiJwtPayload for use in mock verifier responses */
function makePayload(overrides: Partial<FaiJwtPayload> = {}): FaiJwtPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: 'user@example.com',
    email: 'user@example.com',
    roles: [Role.STANDARD_USER],
    iat: now,
    exp: now + 300,
    ...overrides,
  };
}

/**
 * Build a minimal FastifyRequest-shaped object that satisfies the subset
 * of the interface that JwtAuthoriser.verify reads.
 */
function makeRequest(options: { jwt?: string; principalId?: string; url?: string } = {}): FastifyRequest {
  return {
    url: options.url ?? '/test',
    awsLambda: {
      event: {
        requestContext: {
          authorizer: {
            jwt: options.jwt,
            principalId: options.principalId,
          },
        },
      },
      context: {},
    },
  } as unknown as FastifyRequest;
}

/** Build a request where requestContext.authorizer is entirely absent */
function makeRequestWithNoAuthorizer(url = '/test'): FastifyRequest {
  return {
    url,
    awsLambda: {
      event: {
        requestContext: {},
      },
      context: {},
    },
  } as unknown as FastifyRequest;
}

// ---------------------------------------------------------------------------
// JwtAuthoriser
// ---------------------------------------------------------------------------

describe('JwtAuthoriser', () => {
  let verifyMock: ReturnType<typeof vi.fn<(token: string) => Promise<FaiJwtPayload>>>;
  let stubVerifier: JwtVerifierInterface;
  let authoriser: JwtAuthoriser;

  beforeEach(() => {
    vi.clearAllMocks();
    verifyMock = vi.fn();
    stubVerifier = { verify: verifyMock };
    authoriser = new JwtAuthoriser(stubVerifier);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe('valid JWT', () => {
    it('returns { success: true, payload } when the token verifies successfully', async () => {
      const payload = makePayload();
      verifyMock.mockResolvedValue(payload);
      const result = await authoriser.verify(makeRequest({ jwt: 'valid.token.here' }));
      expect(result).toEqual({ success: true, payload });
    });

    it('passes the token from the authorizer context to the verifier', async () => {
      verifyMock.mockResolvedValue(makePayload());
      await authoriser.verify(makeRequest({ jwt: 'my.signed.jwt' }));
      expect(verifyMock).toHaveBeenCalledWith('my.signed.jwt');
    });

    it('logs a success message including sub and url', async () => {
      verifyMock.mockResolvedValue(makePayload({ sub: 'admin@example.com' }));
      await authoriser.verify(makeRequest({ jwt: 'valid.token.here', url: '/some/path' }));
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.info).toHaveBeenCalledWith('JWT verified successfully', {
        sub: 'admin@example.com',
        url: '/some/path',
      });
    });
  });

  // -------------------------------------------------------------------------
  // Missing token
  // -------------------------------------------------------------------------

  describe('missing JWT', () => {
    it('returns { success: false } when there is no jwt field in the authorizer context', async () => {
      const result = await authoriser.verify(makeRequest());
      expect(result).toEqual({ success: false });
    });

    it('returns { success: false } when the authorizer context is entirely absent', async () => {
      const result = await authoriser.verify(makeRequestWithNoAuthorizer());
      expect(result).toEqual({ success: false });
    });

    it('does not call the verifier when the token is missing', async () => {
      await authoriser.verify(makeRequest());
      expect(verifyMock).not.toHaveBeenCalled();
    });

    it('logs a warning including the url when the token is missing', async () => {
      await authoriser.verify(makeRequest({ url: '/protected' }));
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.warn).toHaveBeenCalledWith('Request has no JWT in authorizer context', { url: '/protected' });
    });
  });

  // -------------------------------------------------------------------------
  // Verification failure
  // -------------------------------------------------------------------------

  describe('failed verification', () => {
    it('returns { success: false } when the verifier throws', async () => {
      verifyMock.mockRejectedValue(new Error('signature mismatch'));
      const result = await authoriser.verify(makeRequest({ jwt: 'bad.token.here' }));
      expect(result).toEqual({ success: false });
    });

    it('logs a warning with the url and error when verification fails', async () => {
      const error = new Error('token expired');
      verifyMock.mockRejectedValue(error);
      await authoriser.verify(makeRequest({ jwt: 'expired.token.here', url: '/dashboard' }));
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.warn).toHaveBeenCalledWith('JWT verification failed', { url: '/dashboard', error });
    });

    it('does not re-throw when the verifier throws', async () => {
      verifyMock.mockRejectedValue(new Error('unexpected error'));
      await expect(authoriser.verify(makeRequest({ jwt: 'token' }))).resolves.toEqual({ success: false });
    });
  });

  // -------------------------------------------------------------------------
  // Default verifier construction
  // -------------------------------------------------------------------------

  describe('default constructor', () => {
    it('uses KmsJwtVerifier by default when FAI_AUTH_SIGNING_KEY_ARN is set', () => {
      vi.stubEnv('FAI_AUTH_SIGNING_KEY_ARN', 'arn:aws:kms:eu-west-2:123:key/test');
      expect(() => new JwtAuthoriser()).not.toThrow();
      vi.unstubAllEnvs();
    });
  });
});

// ---------------------------------------------------------------------------
// StubAuthoriser
// ---------------------------------------------------------------------------

describe('StubAuthoriser', () => {
  it('always returns { success: true, payload: {} }', async () => {
    const stub = new StubAuthoriser();
    const result = await stub.verify();
    expect(result).toEqual({ success: true, payload: {} });
  });

  it('resolves without calling any external dependencies', async () => {
    const stub = new StubAuthoriser();
    await expect(stub.verify()).resolves.toEqual({ success: true, payload: {} });
  });
});
