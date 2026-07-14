import './zod-setup';
import { OpenApiGeneratorV3, OpenAPIRegistry, type RouteConfig } from '@asteasolutions/zod-to-openapi';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { ResponseObject } from 'openapi3-ts/oas30';
import { stringify } from 'yaml';
import { z } from 'zod';
import { V1ResponseSchema } from '../data-types/api-schemas-v1';
import { V2ResponseSchema, V2HistoryResponseSchema } from '../data-types/api-schemas-v2';
import { UserIdParameterSchema, V1QuerySchema } from '../data-types/api-parameters';

const registry = new OpenAPIRegistry();

const UserIdParameter = registry.registerParameter('UserId', UserIdParameterSchema.shape.userId);
const HistoryParameter = registry.registerParameter('History', V1QuerySchema.shape.history);

const RegisteredUserIdParameterSchema = z.object({ userId: UserIdParameter });
const RegisteredV1QuerySchema = z.object({ history: HistoryParameter });

registry.register(
  'Error',
  z.object({ message: z.string().openapi({ example: 'error message' }).optional() }).openapi({ title: 'Error Schema' }),
);

interface ResponseEntry {
  description: string;
  content?: Record<string, unknown>;
}

/**
 * Put the responses at the top level with references rather than in schemas
 * @param responses - OpenAPI responses
 * @returns
 */
const hoistResponses = (responses: Record<number, ResponseEntry>): RouteConfig['responses'] =>
  Object.entries(responses).reduce<RouteConfig['responses']>((accumulator, [statusCode, response]) => {
    if (Number(statusCode) === 200)
      // Ignore the default response
      return { ...accumulator, [statusCode]: response as RouteConfig['responses'][string] };

    const name = response.description.replaceAll(' ', '');
    registry.registerComponent('responses', name, response as ResponseObject);
    return { ...accumulator, [statusCode]: { $ref: `#/components/responses/${name}` } };
  }, {});

const errorResponses = {
  400: {
    description: 'Bad Request',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  500: {
    description: 'Server Error',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  502: {
    description: 'Bad Gateway',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  504: {
    description: 'Gateway Timeout',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  default: {
    description: 'Unexpected Error',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
};

registry.register('InterventionStatusResponse', V1ResponseSchema);
registry.register('AccountStatusResponse', V2ResponseSchema);
registry.register('AccountHistoryResponse', V2HistoryResponseSchema);

registry.registerPath({
  method: 'get',
  path: '/v1/ais/{userId}',
  operationId: 'ais',
  tags: ['Status'],
  summary: 'Get User Account Intervention Status',
  description: "Returns the state of the latest intervention applied on a user's account",
  request: {
    params: RegisteredUserIdParameterSchema,
    query: RegisteredV1QuerySchema,
  },
  responses: hoistResponses({
    200: {
      description: 'Ok',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/InterventionStatusResponse' } } },
    },
    ...errorResponses,
  }),
  'x-amazon-apigateway-integration': {
    httpMethod: 'POST',
    type: 'aws_proxy',
    uri: {
      'Fn::Sub':
        'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${StatusRetrieverFunction.Arn}:live/invocations',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v2/ais/{userId}',
  operationId: 'aisV2',
  tags: ['Status'],
  summary: 'Get User Account Intervention Status',
  description: "Returns the active interventions applied on a user's account",
  request: {
    params: RegisteredUserIdParameterSchema,
  },
  responses: hoistResponses({
    200: {
      description: 'Ok',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/AccountStatusResponse' } } },
    },
    ...errorResponses,
  }),
  'x-amazon-apigateway-integration': {
    httpMethod: 'POST',
    type: 'aws_proxy',
    uri: {
      'Fn::Sub':
        'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${StatusRetrieverFunction.Arn}:live/invocations',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v2/ais/{userId}/history',
  operationId: 'aisV2History',
  tags: ['Status'],
  summary: 'Get User Account Intervention History',
  description: "Returns the full intervention history for a user's account",
  request: {
    params: RegisteredUserIdParameterSchema,
  },
  responses: hoistResponses({
    200: {
      description: 'Ok',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/AccountHistoryResponse' } } },
    },
    ...errorResponses,
  }),
  'x-amazon-apigateway-integration': {
    httpMethod: 'POST',
    type: 'aws_proxy',
    uri: {
      'Fn::Sub':
        'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${StatusRetrieverFunction.Arn}:live/invocations',
    },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);

const document = generator.generateDocument({
  openapi: '3.0.3',
  info: {
    title: 'Account Intervention Status API',
    description:
      "An API that provides methods to query the OneLogin Account Interventions Service\nfor the current intervention state of a User's Account.\n\nThis solution was created as part of the Interventions initiative.\n\n__N.B__\n - Recommend HTTP client __Timeout__ settings of `5 seconds` to handle requests where backend services experience cold starts.",
    version: '0.0.1',
    contact: {
      name: 'Government Digital Service - Fraud Team Neptune',
      email: 'interventions@digital.cabinet-office.gov.uk',
    },
    license: {
      name: 'MIT',
      url: 'https://github.com/govuk-one-login/account-interventions-service/blob/main/LICENCE.md',
    },
  },
  servers: [
    {
      url: 'https://{environment}.execute-api.eu-west-2.amazonaws.com/main',
      description: 'defaults to staging environment',
      variables: {
        environment: {
          default: 'vjdj6kjrj2',
          enum: [
            'u9uw8aqu0c', //dev
            'rg7pm38qj4', //build
            'vjdj6kjrj2', //staging
            '65zhj32bjb', //integration
            'ruz07ekh4b', //production
          ],
        },
      },
    },
  ],
  tags: [
    {
      name: 'Status',
      description:
        "Provides information on an account's intervention status.\n\nExpected users are the **DI Internal** teams ONLY.",
    },
  ],
});

// Inline parameter schemas so they don't use $ref to components/schemas
const schemas = document.components?.schemas;
const parameters = document.components?.parameters as
  | Record<string, { schema?: { $ref?: string; description?: string } }>
  | undefined;
if (schemas && parameters) {
  for (const parameter of Object.values(parameters)) {
    const reference = parameter.schema?.$ref;
    const schemaName = reference?.split('/').pop();
    if (schemaName) {
      parameter.schema = schemas[schemaName] as { $ref?: string; description?: string };
      delete parameter.schema.description;
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete schemas[schemaName];
    }
  }
}

const outputPath = path.resolve(import.meta.dirname, '../specs/main.yaml');
writeFileSync(outputPath, stringify(document, { lineWidth: 0 }));
console.log(`Written to ${outputPath}`);
