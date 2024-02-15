import { ResponseFromApiClient } from './api-client-utils';

export class apiClient {
  private url: string;
  public constructor(endpoint: string) {
    this.url = endpoint;
  }

  public async getRequest(userId: string): Promise<ResponseFromApiClient | undefined> {
    try {
      const response = await fetch(this.url + 'ais/' + userId);
      if (response.ok) {
        const data = await response.json();
        return {
          status: response.status,
          message: response.statusText,
          payload: data,
        };
      }
      return this.validateResponseStatus(response.status, response);
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.name);
        console.error(error.message);
      }
    }
  }

  private validateResponseStatus(statusCode: number, response: globalThis.Response) {
    switch (statusCode) {
      case 400: {
        return {
          status: response.status,
          message: response.statusText,
          payload: { message: 'Invalid Request.' },
        };
      }
      case 500: {
        return {
          status: response.status,
          message: response.statusText,
          payload: { message: 'Internal Server Error.' },
        };
      }
      case 502: {
        return {
          status: response.status,
          message: response.statusText,
          payload: { message: 'Bad Gateway.' },
        };
      }
      case 504: {
        return {
          status: response.status,
          message: response.statusText,
          payload: { message: 'Gateway Timeout.' },
        };
      }
      default: {
        return {
          status: response.status,
          message: response.statusText,
          payload: { message: 'Unexpected Error.' },
        };
      }
    }
  }
}
