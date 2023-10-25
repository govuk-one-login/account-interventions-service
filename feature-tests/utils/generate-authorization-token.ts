import EndPoints from '../apiEndpoints/endpoints';
import { DEFAULT_SIGNATURE_TYPE, DEFAULT_TOKEN_TYPE } from './constants';
import { SecretsProvider } from '@aws-lambda-powertools/parameters/secrets';

const secretsProvider = new SecretsProvider({ clientConfig: { region: 'eu-west-2' } });

export enum TokenType {
  EXPIRED = 'tokenType=expired',
  INVALID_ALG = 'tokenType=invalidAlg',
  NONE_ALG = 'tokenType=noneAlg',
  MISSING_KID = 'tokenType=missingKid',
  WRONG_KID = 'tokenType=wrongKid',
  FUTURE_IAT = 'tokenType=iatInFuture',
  DEFAULT = '',
}

export enum TokenSignature {
  EC = 'signatureType=EC',
  RSA = 'signatureType=RSA',
  DEFAULT = '',
}

export enum TokenAudience {
  IPV_CORE = 'vcs',
  ONE_LOGIN_HOME = 'summarise-vcs',
  INVALID = 'invalidAudience',
}

async function getAudienceValueFromSecretsManager(audienceKey: string): Promise<string> {
  const response = await secretsProvider.get(EndPoints.AUDIENCE_SECRET_NAME, { maxAge: 60 });
  if (!response) {
    throw new Error(`failed to get audience value from secrets manager: ${EndPoints.AUDIENCE_SECRET_NAME}`);
  }
  return JSON.parse(response as string)[audienceKey];
}

function generateUrlForTokenRequest(tokenType: string, signatureType: string) {
  const tokenGeneratorValidURL = `${EndPoints.TOKEN_GENERATOR_DOMAIN}${EndPoints.TOKEN_GENERATOR_PATH}`;
  if (!tokenType && !signatureType) return tokenGeneratorValidURL;
  if (tokenType && signatureType) return `${tokenGeneratorValidURL}?${tokenType}&${signatureType}`;
  return `${tokenGeneratorValidURL}?${tokenType || signatureType}`;
}
export async function generateAuthorizationToken(
  userId: string,
  tokenType = DEFAULT_TOKEN_TYPE,
  tokenSignature = DEFAULT_SIGNATURE_TYPE,
  ttl?: number,
  aud?: string | null,
  iss?: string | null,
  iat?: number,
) {
  const tokenTypeQueryParameter = (TokenType as never)[tokenType];
  const tokenSignatureQueryParameter = (TokenSignature as never)[tokenSignature];

  if (tokenSignatureQueryParameter === undefined || tokenTypeQueryParameter === undefined)
    throw new Error('invalid token identifier');
  let audValue = aud;

  if (aud && aud !== TokenAudience.INVALID) {
    console.log('audience identifier = ' + aud);
    const audienceType = (TokenAudience as never)[aud];
    if (audienceType === undefined) throw new Error('invalid audience identifier: ' + aud);
    audValue = await getAudienceValueFromSecretsManager(audienceType);
  }

  const url = generateUrlForTokenRequest(tokenTypeQueryParameter, tokenSignatureQueryParameter);
  const mockFetch = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      sub: userId,
      ttl,
      aud: audValue,
      iss,
      iat,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const mockJSON = await mockFetch.json();
  return mockJSON.token;
}
