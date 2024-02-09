import axios, { AxiosInstance } from 'axios';

export class apiClient {
  private url: string;
  private instance: AxiosInstance;

  public constructor(endpoint: string) {
    this.url = endpoint;
    this.instance = axios.create({
      baseURL: this.url,
    })
  }

  public async getRequest(userId: string) {
    try {
      return await this.instance.get(userId);
    } catch (error) {
      console.log(error);
    }
  }

  public async putRequest(userId: string, data: object) {
    try {
      return await this.instance.put(userId, data);
    } catch (error) {
      console.log(error);
    }
  }
}