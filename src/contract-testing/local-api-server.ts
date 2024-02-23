// import * as http from 'node:http';
// import { invokeGetAccountState } from '../../feature-tests/utils/invoke-apigateway-lambda';
// // import { host } from "../../api-client/api-client-utils";

// type ExpectedOutput = {
//     statusCode: number;
//     body: string;
// }
// export class localApiServer {
//   private userId: string;
//   public constructor(user: string) {
//     this.userId = user;
//   }

//   public async createLocalServer(): Promise<ExpectedOutput | undefined> {
//     const port = 3000;
//     try {
//       const server = http.createServer(async (request, res) => {
//         res.statusCode = 200;
//         res.setHeader('Content-Type', 'application/json');
//         console.log(`booting up server at: ${request.url}`);
//       });
//       server.listen(3000, () => {
//         console.log(`User ID to retrieve from API: ${this.userId} with port ${port}`);
//       });
//       const response = await invokeGetAccountState(this.userId, false);
//       server.closeAllConnections();
//       return {
//         statusCode: response.statusCode,
//         body: response.body
//       }
//     } catch (error) {
//       if (error instanceof Error) {
//         console.error(error.name);
//         console.error(error.message);
//       }
//     }
//   }
// }
