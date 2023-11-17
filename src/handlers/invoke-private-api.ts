import logger from '../commons/logger';

interface CustomEvent {
  userId?: string;
  queryParameters?: string;
  baseUrl?: string;
  endpoint?: string;
  headers?: {
    [key: string]: string;
  };
}

export const handle = async (event: CustomEvent) => {
  const baseUrl = event.baseUrl ?? getBaseUrl();
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

  const response = await responsePromise.json();

  return {
    statusCode: response.status,
    body: JSON.stringify(response),
  };
};

function getUserId() {
  return process.env['USER_ID'] as string;
}

function getBaseUrl() {
  return validateConfiguration('BASE_URL');
}

function getEndpoint() {
  const endpoint = validateConfiguration('END_POINT');
  const prefix = endpoint.startsWith('/') ? '' : '/';
  return prefix + endpoint;
}

function getQueryParameters() {
  return process.env['QUERY_PARAMETERS'] as string;
}

function getHttpRequestMethod() {
  return validateConfiguration('HTTP_REQUEST_METHOD');
}

function validateConfiguration(environmentVariable: string): string {
  if (!process.env[environmentVariable] || process.env[environmentVariable] === 'undefined') {
    const message = `Environment variable ${environmentVariable} is not defined.`;
    logger.error(message);
    throw new Error(message);
  }
  return process.env[environmentVariable] as string;
}
