import axios from 'axios';
import { host, port } from './axios-utils';

const instance = axios.create({
  baseURL: `http://${host}:${port}/`,
  timeout: 1000,
  url: 'http://127.0.0.1:8080/'
});

export class apiClient {
  public async getRequest(userId: string) {
    try {
      return await instance.get(userId);
    } catch (error) {
      console.log(error);
    }
  }

  public async putRequest(userId: string, data: object) {
    try {
      return await instance.put(userId, data);
    } catch (error) {
      console.log(error);
    }
  }
}