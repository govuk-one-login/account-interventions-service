import { Response } from './api-client-utils';

export class apiClient {
  private url: string;
  public constructor(endpoint: string) {
    this.url = endpoint;
  }

  public async getRequest(userId: string): Promise<Response | undefined> {
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
    } catch (error) {
      console.log(error);
    }
  }
}
