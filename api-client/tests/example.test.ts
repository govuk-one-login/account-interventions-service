// import path from "path";
// import { PactV3 } from "@pact-foundation/pact";
// import { IdReuseClient } from "../client/id-reuse-client";
// import { regex } from "@pact-foundation/pact/src/v3/matchers";
// import { AuthorizationOptions } from "../interfaces/interfaces";


// const provider = new PactV3({
//   consumer: "ID Reuse TS Client",
//   provider: "Id-reuse-storage",
//   logLevel: "debug",
//   dir: path.resolve(process.cwd(), "pacts"),
//   port: 8080,
// });
// const testToken = "eyJ0eXhbGciOi.eyJzdWIb3YuIjoiMjAxOS0.qf0yeGQ"
// const exampleToken = "Bearer eyJ0eXhbGciOi.eyJzdWIb3YuIjoiMjAxOS0.qf0yeGQ"

// const authorizationOptions: AuthorizationOptions = {
//   authorizationToken: testToken,
//   apiKey: testApiKey
// }
// const userId = 'testUserID'
// const clientInstance = new IdReuseClient({endpoint: "http://127.0.0.1:8080/"});

// describe("Pact testing", () => {
//   describe("GET /vcs Retrieve Endpoint", () => {
//     it('Retrieve 200 without afterkey', async () => {
//       await provider.addInteraction({
//         states: [{description: "user testUserID has one VC"}],
//         uponReceiving: "retrieve data request without afterKey param",
//         withRequest: {
//           method: "GET",
//           path: "/vcs/testUserID",
//           headers: {
//             Authorization: exampleToken,
//             "x-api-key": "testApiKey",
//             "Content-Type": "application/json",
//           },
//         },
//         willRespondWith: {
//           status: 200,
//           body: {
//             vcs: ["abc.abc.abc"]}
//         },
//       });
//       await provider.executeTest(async () => {
//         const response = clientInstance.retrieveData({
//           userId,
//           authorizationOptions
//         });
//         const output = await response.next();
//         expect(output.done).toEqual(true);
//         expect(output.value).toEqual({"responseMetadata":{"statusCode":200,"message":"OK"},"payload":{ "vcs" : ["abc.abc.abc"]}});
//       })
//     });

//     it('Retrieve 200 with after key returned in response', async () => {
//       await provider.addInteraction({
//         states: [{description: "user testUserID has more VCs than the return limit"}],
//         uponReceiving: "retrieve data request without afterKey param",
//         withRequest: {
//           method: "GET",
//           path: "/vcs/testUserID",
//           headers: {
//             Authorization: exampleToken,
//             "x-api-key": "testApiKey",
//             "Content-Type": "application/json",
//           },
//         },
//         willRespondWith: {
//           status: 200,
//           body: {
//             vcs: ["dfg.dfg.dfg","tre.tre.tre","abc.abc.abc"],
//             afterKey: "abc"
//           }
//         },
//       });

//       await provider.executeTest(async () => {
//         const response = clientInstance.retrieveData({
//           userId,
//           authorizationOptions
//         });
//         const output = await response.next();
//         expect(output.done).toEqual(false);
//         expect(output.value).toEqual({"responseMetadata":{"statusCode":200,"message":"OK"},"payload":{"afterKey":"abc","vcs":["dfg.dfg.dfg","tre.tre.tre","abc.abc.abc"]}})
//       })
//     });

//     it('Retrieve 200 with after key passed as query param', async () => {
//       await provider.addInteraction({
//         states: [{description: "user testUserID has more VCs than the return limit"}],
//         uponReceiving: "retrieve data request with afterKey param",
//         withRequest: {
//           method: "GET",
//           path: "/vcs/testUserID",
//           query: { afterKey: "abc"},
//           headers: {
//             Authorization: exampleToken,
//             "x-api-key": "testApiKey",
//             "Content-Type": "application/json",
//           },
//         },
//         willRespondWith: {
//           status: 200,
//           body: {
//             vcs: ["dfg.dfg.dfg","tre.tre.tre"],
//           }
//         },
//       });

//       await provider.executeTest(async () => {
//         const response = clientInstance.retrieveData({
//           userId,
//           afterKey: "abc",
//           authorizationOptions
//         });
//         const output = await response.next();
//         expect(output.done).toEqual(true);
//         expect(output.value).toEqual({"responseMetadata":{"statusCode":200,"message":"OK"},"payload":{"vcs":["dfg.dfg.dfg","tre.tre.tre"]}})
//       })
//     });

//     it('Retrieve 404', async () => {
//       await provider.addInteraction({
//         states: [{description: "there is no data for testUserID"}],
//         uponReceiving: "retrieve data request",
//         withRequest: {
//           method: "GET",
//           path: "/vcs/testUserID",
//           headers: {
//             Authorization: regex("^Bearer [A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*$", exampleToken),
//             "x-api-key": "testApiKey",
//             "Content-Type": "application/json",
//           },
//         },
//         willRespondWith: {
//           status: 404,
//           body: {
//             message: "no data found"
//           }
//         },
//       });
//       await provider.executeTest(async () => {
//         const response = clientInstance.retrieveData({
//           userId,
//           authorizationOptions
//         });
//         const output = await response.next();
//         expect(output.done).toEqual(true);
//         expect(output.value).toEqual({ responseMetadata: { statusCode: 404, message: 'Not Found' }, payload: { message: "no data found"}});
//       })
//     });

//     it('Retrieve Error 500', async () => {
//       await provider.addInteraction({
//         states: [{description: "Retrieve operation has 500 server error"}],
//         uponReceiving: "retrieve data request",
//         withRequest: {
//           method: "GET",
//           path: "/vcs/testUserID",
//           headers: {
//             Authorization: regex("^Bearer [A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*$", exampleToken),
//             "x-api-key": "testApiKey",
//             "Content-Type": "application/json",
//           },
//         },
//         willRespondWith: {
//           status: 500,
//           body: {
//             message: "Internal Server Error"
//           }
//         },
//       });
//       await provider.executeTest(async () => {
//         const response = clientInstance.retrieveData({
//           userId,
//           authorizationOptions
//         });
//         const output = await response.next();
//         expect(output.done).toEqual(true);
//         expect(output.value).toEqual({ responseMetadata: { statusCode: 500, message: 'Internal Server Error' }, payload: { message: "Internal Server Error"}});
//       })
//     });

//     it('Retrieve Error 502', async () => {
//       await provider.addInteraction({
//         states: [{description: "Retrieve operation has 502 server error"}],
//         uponReceiving: "retrieve data request",
//         withRequest: {
//           method: "GET",
//           path: "/vcs/testUserID",
//           headers: {
//             Authorization: regex("^Bearer [A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*$", exampleToken),
//             "x-api-key": "testApiKey",
//             "Content-Type": "application/json",
//           },
//         },
//         willRespondWith: {
//           status: 502,
//           body: {
//             message: 'Bad Gateway'
//           }

//         },
//       });
//       await provider.executeTest(async () => {
//         const response = clientInstance.retrieveData({
//           userId,
//           authorizationOptions
//         });
//         const output = await response.next();
//         expect(output.done).toEqual(true);
//         expect(output.value).toEqual({ responseMetadata: { statusCode: 502, message: 'Bad Gateway' }, ...