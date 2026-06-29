/* istanbul ignore: not production */
// Stryker disable all: Not used in production
import getEnvironmentOrThrow from '../commons/get-environment-or-throw';
import logger from '../commons/logger';

export interface CustomEvent {
  userId?: string;
  queryParameters?: string;
  baseUrl?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  privateApi?: boolean;
}

export async function handle(event: CustomEvent) {
  const baseUrl = event.baseUrl ?? getBaseUrl(event);
  const endpoint = event.endpoint ?? getEndpoint();
  const userId = encodeURI(event.userId ?? getUserId());
  const headers = event.headers ?? { 'Content-Type': 'application/json' };
  const httpRequestMethod = getHttpRequestMethod();

  let queryParameters = event.queryParameters ?? getQueryParameters();
  queryParameters = queryParameters ? '?' + queryParameters : '';

  const url = `${baseUrl}${endpoint}/${userId}${queryParameters}`;

  logger.info(`invoking the url: ${url}`);

  const responsePromise = await fetch(url, {
    method: httpRequestMethod,
    headers,
  });

  const response = (await responsePromise.json()) as Response;

  return {
    statusCode: response.status,
    body: JSON.stringify(response),
  };
}

function getUserId() {
  return getEnvironmentOrThrow('USER_ID');
}

function getBaseUrl(event: CustomEvent) {
  return validateConfig(event.privateApi ? 'PRIVATE_API_URL' : 'BASE_URL');
}

function getEndpoint() {
  const endpoint = validateConfig('END_POINT');
  return (endpoint.startsWith('/') ? '' : '/') + endpoint;
}

function getQueryParameters() {
  return getEnvironmentOrThrow('QUERY_PARAMETERS');
}

function getHttpRequestMethod() {
  return validateConfig('HTTP_REQUEST_METHOD');
}

function validateConfig(environmentVariable: string): string {
  const value = process.env[environmentVariable];
  if (!value || value === 'undefined') {
    const message = `Environment variable ${environmentVariable} is not defined.`;
    logger.error(message);
    throw new Error(message);
  }
  return value;
}
