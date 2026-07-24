import { KMSClient, GetPublicKeyCommand } from '@aws-sdk/client-kms';
import { importSPKI, jwtVerify, type JWTPayload } from 'jose';
import logger from '../commons/logger';
import getEnvironmentOrThrow from '../commons/get-environment-or-throw';

export enum Role {
  STANDARD_USER = 'standard-user',
  ADMINISTRATOR = 'administrator',
  JOINT_CSV_UPLOAD = 'joint-csv-upload',
}

/**
 * The subset of JWT claims we expect from the FAI authoriser.
 * Extend as the FAI contract evolves.
 */
export interface FaiJwtPayload extends JWTPayload {
  /** The authenticated user's email */
  sub: string;
  /** The authenticated user's email */
  email: string;
  /** The user's authorisation roles */
  roles: Role[];
  iat: number;
  exp: number;
}

export interface JwtVerifierInterface {
  verify(token: string): Promise<FaiJwtPayload>;
}

/**
 * Verifies JWTs issued by the FAI authoriser.
 *
 * The public key is fetched from KMS once on first use and then cached for the
 * lifetime of the Lambda execution environment, matching the pattern described
 * in ADR 010. KMS GetPublicKey is a read-only, cross-account operation — the
 * FAI team grants AIS access to the key ARN via KMS key policy.
 *
 * Expected environment variables:
 *   FAI_AUTH_SIGNING_KEY_ARN  — the ARN of the FAI asymmetric KMS signing key
 */
export class KmsJwtVerifier implements JwtVerifierInterface {
  private cachedPublicKey: CryptoKey | undefined;

  constructor(
    private readonly kmsClient: KMSClient = new KMSClient(),
    private readonly keyArn: string = getEnvironmentOrThrow('FAI_AUTH_SIGNING_KEY_ARN'),
  ) {}

  /**
   * Verifies the JWT signature and standard claims (exp, nbf, iat).
   * Returns the decoded payload on success; throws on any verification failure.
   */
  async verify(token: string): Promise<FaiJwtPayload> {
    const publicKey = await this.getPublicKey();

    const { payload } = await jwtVerify<FaiJwtPayload>(token, publicKey, {
      // Require the token to be a JWT (not a plain JWS)
      typ: 'JWT',
    });

    return payload;
  }

  /**
   * Returns the cached public key, fetching it from KMS on first call.
   */
  private async getPublicKey(): Promise<CryptoKey> {
    if (this.cachedPublicKey) return this.cachedPublicKey;

    logger.info('Fetching FAI signing public key from KMS', { keyArn: this.keyArn });

    const response = await this.kmsClient.send(new GetPublicKeyCommand({ KeyId: this.keyArn }));

    if (!response.PublicKey) {
      throw new Error(`KMS GetPublicKey returned no key material for ARN: ${this.keyArn}`);
    }

    // KMS returns the public key as DER-encoded SubjectPublicKeyInfo (SPKI).
    // jose's importSPKI expects PEM, so we convert.
    const pem = derToPem(response.PublicKey);
    this.cachedPublicKey = await importSPKI(pem, 'RS256', { extractable: false });

    return this.cachedPublicKey;
  }
}

/**
 * Converts a DER-encoded SubjectPublicKeyInfo buffer to a PEM string.
 */
function derToPem(der: Uint8Array): string {
  const b64 = Buffer.from(der).toString('base64');
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----\n`;
}
