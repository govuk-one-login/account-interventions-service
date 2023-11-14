import { AppConfigService } from '../services/app-config-service';
import logger from '../commons/logger';

interface CustomEvent {
  userId?: string;
  queryParameters?: string;
  headers?: {
    [key: string]: string;
  };
}

const appConfig = AppConfigService.getInstance();

export const handle = async (event: CustomEvent) => {
  const userId = event.userId || appConfig.userId;
  let queryParameters = event.queryParameters || appConfig.queryParameters;
  queryParameters = queryParameters ? '?' + queryParameters : '';

  if (!userId) {
    return {
      statusCode: 400,
      message: 'UserId is required. Provide by either adding userId to event, or providing as an environment variable.',
    };
  }

  const headers = event.headers || { 'Content-Type': 'application/json' };
  const baseUrl = appConfig.baseUrl;
  const endpoint = appConfig.endpoint;
  const httpRequestMethod = appConfig.httpRequestMethod;

  const url = `${baseUrl}${endpoint}/${userId}${queryParameters}`;
  logger.info(`invoking the url: ${url}`);

  const responsePromise = await fetch(url, {
    method: httpRequestMethod,
    headers,
  });

  const response = await responsePromise.json();

  if (Object.keys(response).length === 0) {
    return {
      statusCode: response.status || 400,
      message: "Request didn't return a valid response",
    };
  }

  return {
    statusCode: response.status,
    message: JSON.stringify(response),
  };
};
