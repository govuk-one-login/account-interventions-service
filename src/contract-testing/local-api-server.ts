import * as http from 'node:http';
import { invokeGetAccountState } from '../../feature-tests/utils/invoke-apigateway-lambda';
// import { host } from "../../api-client/api-client-utils";

export class localApiServer {
  private userId: string;
  public constructor(user: string) {
    this.userId = user;
  }

  public async createLocalServer(): Promise<void> {
    const server = http.createServer(async (request, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      console.log(`booting up server at: ${request.url}`);
    });
    server.listen(() => {
      console.log(server.address());
      console.log(`User ID to retrieve from API: ${this.userId}`);
    });
    await invokeGetAccountState(this.userId, false).catch();
    server.closeAllConnections();
  }
}
