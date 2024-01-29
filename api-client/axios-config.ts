import axios from 'axios';

export const instance = axios.create({
  baseURL: 'http://localhost:8080/',
  timeout: 1000,
});

export class apiClient {
  public async getRequest(userId: string) {
    try {
      return await instance.get(userId);
    } catch (error) {
      console.log(error);
    }
  }
}
