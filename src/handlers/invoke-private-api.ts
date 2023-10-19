import { AppConfigService } from '../services/app-config-service';
import logger from '../commons/logger';

const appConfig = AppConfigService.getInstance();

export const handle = async () => {
  const userId = appConfig.userId;
  const baseUrl = appConfig.baseUrl;
  const endpoint = appConfig.endpoint;
  const httpRequestMethod = appConfig.httpRequestMethod;

  const url = `${baseUrl}${endpoint}/${userId}`;
  logger.info(`invoking the url: ${url}`);

  const responseJson = await fetch(url, {
    method: httpRequestMethod,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const response = await responseJson.json();
  return {
    statusCode: 200,
    message: JSON.stringify(response),
  };
};
