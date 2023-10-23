// import { ContextExamples } from '@aws-lambda-powertools/commons';
// import { StateDetails } from '../../data-types/interfaces';
// import { handle } from '../status-retriever-handler';
// import type { APIGatewayEvent } from 'aws-lambda';
// // import { mockClient } from 'aws-sdk-client-mock';
// // import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
// // import { DynamoDbService } from '../../services/dynamo-db-service';
// // import { logAndPublishMetric } from '../../commons/metrics';
// import logger from "../../commons/logger";
// import 'aws-sdk-client-mock-jest';

// export interface AccountStatusTable extends StateDetails {
//   pk: string;
//   intervention: string;
//   sentAt: number;
//   appliedAt: number;
//   reprovedIdentityAt?: number;
//   resetPasswordAt?: number;
//   accountDeletedAt?: number;
//   resetPassword: boolean;
//   isAccountDeleted?: boolean;
//   auditLevel?: string;
//   history: [];
//   ttl: number;
// }

// jest.mock('../../commons/logger.ts');
// const mockConfig = ContextExamples.helloworldContext;
// const testEvent: APIGatewayEvent = {
//     body: null,
//     headers: {},
//     multiValueHeaders: {},
//     httpMethod: "POST",
//     isBase64Encoded: false,
//     path: "/path/to/resource",
//     pathParameters: {
//       proxy: '/ais/{user_id}',
//       userId: 'testUserID',
//     },
//     queryStringParameters: null,
//     multiValueQueryStringParameters: null,
//     stageVariables: null,
//     requestContext: {
//       accountId: "123456789012",
//       apiId: "1234567890",
//       authorizer: {},
//       protocol: "HTTP/1.1",
//       httpMethod: "POST",
//       identity: {
//         accessKey: null,
//         accountId: null,
//         apiKey: null,
//         apiKeyId: null,
//         caller: null,
//         clientCert: null,
//         cognitoAuthenticationProvider: null,
//         cognitoAuthenticationType: null,
//         cognitoIdentityId: null,
//         cognitoIdentityPoolId: null,
//         principalOrgId: null,
//         sourceIp: "127.0.0.1",
//         userArn: null,
//         userAgent: "Custom User Agent String",
//         user: null
//       },
//       path: "/prod/path/to/resource",
//       stage: "prod",
//       requestId: "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
//       requestTime: "09/Apr/2015:12:34:56 +0000",
//       requestTimeEpoch: 1428582896000,
//       resourceId: "123456",
//       resourcePath: "/{proxy+}",
//     },
//     resource: "/{proxy+}"
//   };

// describe('status-retriever-handler', () => {
//     let mockedAccount: AccountStatusTable;
//     beforeEach(() => {
//         mockedAccount = {
//         pk: 'subjectId',
//         intervention: 'intervention name',
//         sentAt: 123456789,
//         appliedAt: 12345685809,
//         blocked: false,
//         suspended: true,
//         resetPassword: false,
//         reproveIdentity: false,
//         history: [],
//         ttl: 123
//       };
//       jest.clearAllMocks();
//       jest.resetAllMocks();
//     });

    // xit('will get the records by pk', async () => {
    //     const response = await handle(testEvent, mockConfig);
    //     expect(logger.error).toBeCalledWith('')
    //     expect(response.body).toEqual(mockedAccount);
    // });
//});