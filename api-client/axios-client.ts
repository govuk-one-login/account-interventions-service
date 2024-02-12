import axios, { AxiosInstance } from 'axios';

interface Response {
  status: number;
  message: string;
  payload: object;
}

export class apiClient {
  private url: string;
  private instance: AxiosInstance;

  public constructor(endpoint: string) {
    this.url = endpoint;
    this.instance = axios.create({
      baseURL: this.url + 'ais/',
    });
  }

  public async getRequest(userId: string): Promise<Response | undefined> {
    try {
      const response = await this.instance.get(userId);
      return {
        status: response.status,
        message: response.statusText,
        payload: response.data,
      };
    } catch (error) {
      console.log(error);
    }
  }
}
