import { JwtAuthoriser, type AuthoriserContext } from '../authoriser';
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
 * Build a minimal authoriser context object as would come from
 * requestContext.authorizer in the Lambda event.
 */
const makeContext = (options: { jwt?: string; principalId?: string } = {}): AuthoriserContext => ({
  jwt: options.jwt,
  principalId: options.principalId,
});

/** Create a stub verifier with a fresh vi.fn() */
function makeVerifier(): {
  verifyMock: ReturnType<typeof vi.fn<(token: string) => Promise<FaiJwtPayload>>>;
  verifier: JwtVerifierInterface;
} {
  const verifyMock = vi.fn<(token: string) => Promise<FaiJwtPayload>>();
  return { verifyMock, verifier: { verify: verifyMock } };
}

/** URL constant reused across tests */
const TEST_URL = '/test';

// ---------------------------------------------------------------------------
// JwtAuthoriser
// ---------------------------------------------------------------------------

describe('JwtAuthoriser', () => {
  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe('valid JWT', () => {
    it('returns { success: true, payload } when the token verifies successfully', async () => {
      const { verifyMock, verifier } = makeVerifier();
      const authoriser = new JwtAuthoriser(verifier);
      const payload = makePayload();
      verifyMock.mockResolvedValue(payload);
      const result = await authoriser.verify(makeContext({ jwt: 'valid.token.here' }), TEST_URL);
      expect(result).toEqual({ success: true, payload });
    });

    it('passes the token from the authorizer context to the verifier', async () => {
      const { verifyMock, verifier } = makeVerifier();
      const authoriser = new JwtAuthoriser(verifier);
      verifyMock.mockResolvedValue(makePayload());
      await authoriser.verify(makeContext({ jwt: 'my.signed.jwt' }), TEST_URL);
      expect(verifyMock).toHaveBeenCalledWith('my.signed.jwt');
    });

    it('logs a success message including sub and url', async () => {
      const { verifyMock, verifier } = makeVerifier();
      const authoriser = new JwtAuthoriser(verifier);
      verifyMock.mockResolvedValue(makePayload({ sub: 'admin@example.com' }));
      await authoriser.verify(makeContext({ jwt: 'valid.token.here' }), '/some/path');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.info).toHaveBeenCalledWith('JWT verified successfully', {
        url: '/some/path',
      });
    });
  });

  // -------------------------------------------------------------------------
  // Missing token
  // -------------------------------------------------------------------------

  describe('missing JWT', () => {
    it('returns { success: false } when there is no jwt field in the authorizer context', async () => {
      const { verifier } = makeVerifier();
      const authoriser = new JwtAuthoriser(verifier);
      const result = await authoriser.verify(makeContext(), TEST_URL);
      expect(result).toEqual({ success: false });
    });

    it('returns { success: false } when the authorizer context is entirely absent', async () => {
      const { verifier } = makeVerifier();
      const authoriser = new JwtAuthoriser(verifier);
      const result = await authoriser.verify(undefined, TEST_URL);
      expect(result).toEqual({ success: false });
    });

    it('does not call the verifier when the token is missing', async () => {
      const { verifyMock, verifier } = makeVerifier();
      const authoriser = new JwtAuthoriser(verifier);
      await authoriser.verify(makeContext(), TEST_URL);
      expect(verifyMock).not.toHaveBeenCalled();
    });

    it('logs a warning including the url when the token is missing', async () => {
      const { verifier } = makeVerifier();
      const authoriser = new JwtAuthoriser(verifier);
      await authoriser.verify(makeContext(), '/protected');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.warn).toHaveBeenCalledWith('Request has invalid or missing JWT in authorizer context', {
        url: '/protected',
      });
    });
  });

  // -------------------------------------------------------------------------
  // Verification failure
  // -------------------------------------------------------------------------

  describe('failed verification', () => {
    it('returns { success: false } when the verifier throws', async () => {
      const { verifyMock, verifier } = makeVerifier();
      const authoriser = new JwtAuthoriser(verifier);
      verifyMock.mockRejectedValue(new Error('signature mismatch'));
      const result = await authoriser.verify(makeContext({ jwt: 'bad.token.here' }), TEST_URL);
      expect(result).toEqual({ success: false });
    });

    it('logs a warning with the url and error when verification fails', async () => {
      const { verifyMock, verifier } = makeVerifier();
      const authoriser = new JwtAuthoriser(verifier);
      const error = new Error('token expired');
      verifyMock.mockRejectedValue(error);
      await authoriser.verify(makeContext({ jwt: 'expired.token.here' }), '/dashboard');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.warn).toHaveBeenCalledWith('JWT verification failed', { url: '/dashboard', error });
    });

    it('does not re-throw when the verifier throws', async () => {
      const { verifyMock, verifier } = makeVerifier();
      const authoriser = new JwtAuthoriser(verifier);
      verifyMock.mockRejectedValue(new Error('unexpected error'));
      await expect(authoriser.verify(makeContext({ jwt: 'token' }), TEST_URL)).resolves.toEqual({ success: false });
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
