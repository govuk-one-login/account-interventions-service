import { FastifyRequest } from 'fastify';
import logger from '../commons/logger';
import { JwtVerifierInterface, KmsJwtVerifier } from '../services/jwt-verifier';
import { JWTPayload } from 'jose';

export type AuthoriserResult =
  | {
      success: true;
      payload: JWTPayload;
    }
  | {
      success: false;
    };

export interface Authoriser {
  verify(request: FastifyRequest): Promise<AuthoriserResult>;
}

export class JwtAuthoriser implements Authoriser {
  constructor(readonly jwtVerifier: JwtVerifierInterface = new KmsJwtVerifier()) {}

  async verify(request: FastifyRequest): Promise<AuthoriserResult> {
    const authorizer = request.awsLambda.event.requestContext.authorizer as
      { jwt?: string; principalId?: string } | undefined;

    const token = authorizer?.jwt;

    if (!token) {
      logger.warn('Request has no JWT in authorizer context', { url: request.url });
      return { success: false };
    }

    try {
      const payload = await this.jwtVerifier.verify(token);
      logger.info('JWT verified successfully', { sub: payload.sub, url: request.url });
      return { success: true, payload };
    } catch (error) {
      logger.warn('JWT verification failed', { url: request.url, error });
      return { success: false };
    }
  }
}

export class StubAuthoriser implements Authoriser {
  verify(): Promise<AuthoriserResult> {
    return Promise.resolve({
      success: true,
      payload: {},
    });
  }
}
