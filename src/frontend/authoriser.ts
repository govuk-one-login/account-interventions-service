import logger from '../commons/logger';
import { JwtVerifierInterface, KmsJwtVerifier } from '../services/jwt-verifier';
import { JWTPayload } from 'jose';
import z from 'zod';

const contextSchema = z.object({
  jwt: z.string(),
});

export type AuthoriserContext = undefined | null | Record<string, unknown>;

export type AuthoriserResult =
  | {
      success: true;
      payload: JWTPayload;
    }
  | {
      success: false;
    };

export interface Authoriser {
  verify(authoriserContext: AuthoriserContext, url: string): Promise<AuthoriserResult>;
}

export class JwtAuthoriser implements Authoriser {
  constructor(readonly jwtVerifier: JwtVerifierInterface = new KmsJwtVerifier()) {}

  async verify(authoriserContext: AuthoriserContext, url: string): Promise<AuthoriserResult> {
    const context = this.validateContext(authoriserContext);

    if (!context.success) {
      logger.warn('Request has no JWT in authorizer context', { url });
      return { success: false };
    }

    try {
      const payload = await this.jwtVerifier.verify(context.data.jwt);
      logger.info('JWT verified successfully', { url });
      return { success: true, payload };
    } catch (error) {
      logger.warn('JWT verification failed', { url, error });
      return { success: false };
    }
  }

  validateContext(authorizerContext: unknown) {
    return contextSchema.safeParse(authorizerContext);
  }
}

export class StubAuthoriser implements Authoriser {
  verify(_authoriserContext: AuthoriserContext, _url: string): Promise<AuthoriserResult> {
    return Promise.resolve({
      success: true,
      payload: {},
    });
  }
}
