import { KMSClient } from '@aws-sdk/client-kms';
import { exportSPKI, exportPKCS8, generateKeyPair, SignJWT } from 'jose';
import { KmsJwtVerifier, Role, type FaiJwtPayload } from '../jwt-verifier';
import logger from '../../commons/logger';

vi.mock('@aws-lambda-powertools/logger');

// ---------------------------------------------------------------------------
// KMSClient stub
// ---------------------------------------------------------------------------

const kmsSendFn = vi.fn();

vi.mock('@aws-sdk/client-kms', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-kms')>();
  return {
    ...actual,
    KMSClient: vi.fn(function () {
      return { send: kmsSendFn };
    }),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert PEM to DER Uint8Array (strips header/footer and base64-decodes) */
function pemToDer(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replaceAll('\n', '');
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

/** Generate a fresh RSA-2048 key pair and return helpers for signing / spki */
async function makeKeyPair() {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });

  const spkiPem = await exportSPKI(publicKey);
  const pkcs8Pem = await exportPKCS8(privateKey);

  /** Build a signed JWT with the given payload overrides */
  async function signJwt(
    overrides: Partial<FaiJwtPayload> & Record<string, unknown> = {},
    expOffsetSeconds = 300,
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({
      sub: 'user@example.com',
      email: 'user@example.com',
      roles: [Role.STANDARD_USER],
      iat: now,
      exp: now + expOffsetSeconds,
      ...overrides,
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .sign(privateKey);
  }

  return { privateKey, publicKey, spkiPem, pkcs8Pem, publicKeyDer: pemToDer(spkiPem), signJwt };
}

const KEY_ARN = 'arn:aws:kms:eu-west-2:123456789012:key/test-key-id';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KmsJwtVerifier', () => {
  let keys: Awaited<ReturnType<typeof makeKeyPair>>;

  beforeAll(async () => {
    keys = await makeKeyPair();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: KMS returns our test public key DER bytes
    kmsSendFn.mockResolvedValue({ PublicKey: keys.publicKeyDer });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // -------------------------------------------------------------------------
  // Constructor / env-var handling
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('uses the FAI_AUTH_SIGNING_KEY_ARN env var when no keyArn is supplied', () => {
      vi.stubEnv('FAI_AUTH_SIGNING_KEY_ARN', KEY_ARN);
      // Should not throw — env var is present
      expect(() => new KmsJwtVerifier()).not.toThrow();
    });

    it('throws when FAI_AUTH_SIGNING_KEY_ARN is absent and no keyArn is supplied', () => {
      vi.stubEnv('FAI_AUTH_SIGNING_KEY_ARN', '');
      expect(() => new KmsJwtVerifier()).toThrow('Environment variable FAI_AUTH_SIGNING_KEY_ARN not found');
    });
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe('verify – valid token', () => {
    it('returns the decoded payload for a valid JWT', async () => {
      const token = await keys.signJwt();
      const verifier = new KmsJwtVerifier(new KMSClient(), KEY_ARN);

      const payload = await verifier.verify(token);

      expect(payload.sub).toBe('user@example.com');
      expect(payload.email).toBe('user@example.com');
      expect(payload.roles).toEqual([Role.STANDARD_USER]);
    });

    it('returns the payload with multiple roles', async () => {
      const token = await keys.signJwt({ roles: [Role.STANDARD_USER, Role.ADMINISTRATOR] });
      const verifier = new KmsJwtVerifier(new KMSClient(), KEY_ARN);

      const payload = await verifier.verify(token);

      expect(payload.roles).toEqual([Role.STANDARD_USER, Role.ADMINISTRATOR]);
    });
  });

  // -------------------------------------------------------------------------
  // KMS public-key fetching
  // -------------------------------------------------------------------------

  describe('getPublicKey', () => {
    it('fetches the public key from KMS on the first call', async () => {
      const token = await keys.signJwt();
      const verifier = new KmsJwtVerifier(new KMSClient(), KEY_ARN);

      await verifier.verify(token);

      expect(kmsSendFn).toHaveBeenCalledTimes(1);
    });

    it('caches the public key and only calls KMS once for multiple verifications', async () => {
      const token1 = await keys.signJwt();
      const token2 = await keys.signJwt();
      const verifier = new KmsJwtVerifier(new KMSClient(), KEY_ARN);

      await verifier.verify(token1);
      await verifier.verify(token2);

      expect(kmsSendFn).toHaveBeenCalledTimes(1);
    });

    it('logs an info message when fetching the public key from KMS', async () => {
      const token = await keys.signJwt();
      const verifier = new KmsJwtVerifier(new KMSClient(), KEY_ARN);

      await verifier.verify(token);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.info).toHaveBeenCalledWith('Fetching FAI signing public key from KMS', { keyArn: KEY_ARN });
    });

    it('throws when KMS returns no key material', async () => {
      kmsSendFn.mockResolvedValue({ PublicKey: undefined });
      const verifier = new KmsJwtVerifier(new KMSClient(), KEY_ARN);

      await expect(verifier.verify('any.token.here')).rejects.toThrow(
        `KMS GetPublicKey returned no key material for ARN: ${KEY_ARN}`,
      );
    });

    it('propagates errors thrown by KMSClient.send', async () => {
      kmsSendFn.mockRejectedValue(new Error('KMS unavailable'));
      const verifier = new KmsJwtVerifier(new KMSClient(), KEY_ARN);

      await expect(verifier.verify('any.token.here')).rejects.toThrow('KMS unavailable');
    });
  });

  // -------------------------------------------------------------------------
  // JWT verification failures
  // -------------------------------------------------------------------------

  describe('verify – invalid token', () => {
    it('throws for an expired token', async () => {
      // exp is in the past (−60 s)
      const token = await keys.signJwt({}, -60);
      const verifier = new KmsJwtVerifier(new KMSClient(), KEY_ARN);

      await expect(verifier.verify(token)).rejects.toThrow();
    });

    it('throws for a token signed with a different key', async () => {
      const { signJwt: signWithOtherKey } = await makeKeyPair();
      const token = await signWithOtherKey();
      const verifier = new KmsJwtVerifier(new KMSClient(), KEY_ARN);

      await expect(verifier.verify(token)).rejects.toThrow();
    });

    it('throws for a completely malformed token string', async () => {
      const verifier = new KmsJwtVerifier(new KMSClient(), KEY_ARN);

      await expect(verifier.verify('not.a.jwt')).rejects.toThrow();
    });

    it('throws for a token missing the typ: JWT header', async () => {
      // Sign without the typ header
      const now = Math.floor(Date.now() / 1000);
      const { privateKey } = keys;
      const token = await new SignJWT({
        sub: 'user@example.com',
        email: 'user@example.com',
        roles: [Role.STANDARD_USER],
        iat: now,
        exp: now + 300,
      })
        .setProtectedHeader({ alg: 'RS256' }) // no typ: 'JWT'
        .sign(privateKey);

      const verifier = new KmsJwtVerifier(new KMSClient(), KEY_ARN);

      await expect(verifier.verify(token)).rejects.toThrow();
    });
  });
});
