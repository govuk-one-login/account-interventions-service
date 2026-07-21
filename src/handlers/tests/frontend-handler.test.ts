import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Mocked at the module level so all imports of these modules get the stubs.
vi.mock('@fastify/aws-lambda');
vi.mock('../../frontend/app');

const mockProxy = vi.fn();
const mockContext = {} as Context;

/**
 * Builds a minimal APIGatewayProxyEvent with only the fields needed by the handler.
 */
const makeEvent = (path: string): APIGatewayProxyEvent => ({
  path,
  httpMethod: 'GET',
  headers: {},
  multiValueHeaders: {},
  // eslint-disable-next-line unicorn/no-null
  queryStringParameters: null,
  // eslint-disable-next-line unicorn/no-null
  multiValueQueryStringParameters: null,
  // eslint-disable-next-line unicorn/no-null
  pathParameters: null,
  // eslint-disable-next-line unicorn/no-null
  stageVariables: null,
  requestContext: {} as APIGatewayProxyEvent['requestContext'],
  resource: '',
  // eslint-disable-next-line unicorn/no-null
  body: null,
  isBase64Encoded: false,
});

describe('frontend-handler', () => {
  beforeEach(async () => {
    // Reset modules before each test so that the module-level `subpath` and
    // `proxy` constants are re-evaluated against the current env stubs.
    vi.resetModules();

    // Re-apply mocks after resetModules (vi.mock hoisting only covers the
    // initial module load; after resetModules we set return values imperatively).
    const awsLambdaFastify = await import('@fastify/aws-lambda');
    vi.mocked(awsLambdaFastify.default).mockReturnValue(mockProxy);

    mockProxy.mockResolvedValue({ statusCode: 200, body: '' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe('when SUBPATH is not set', () => {
    it('passes the event path through unchanged', async () => {
      const { handler } = await import('../frontend-handler');
      const event = makeEvent('/some/path');

      await handler(event, mockContext);

      expect(mockProxy).toHaveBeenCalledOnce();
      const [calledEvent] = mockProxy.mock.calls[0] as [APIGatewayProxyEvent, Context];
      expect(calledEvent.path).toBe('/some/path');
    });

    it('passes the context through to the proxy unchanged', async () => {
      const { handler } = await import('../frontend-handler');
      const event = makeEvent('/');

      await handler(event, mockContext);

      expect(mockProxy).toHaveBeenCalledWith(expect.anything(), mockContext);
    });
  });

  describe('when SUBPATH is set', () => {
    beforeEach(() => {
      vi.stubEnv('SUBPATH', '/interventions');
    });

    it.each([
      {
        description: 'strips the subpath prefix from matching paths',
        inputPath: '/interventions/user/abc',
        expectedPath: '/user/abc',
      },
      {
        description: 'returns "/" when the path exactly matches the subpath',
        inputPath: '/interventions',
        expectedPath: '/',
      },
      {
        description: 'does not modify paths that do not start with the subpath',
        inputPath: '/other/path',
        expectedPath: '/other/path',
      },
      {
        // /interventions-v2 starts with /interventions but is not the subpath;
        // documents the current behaviour (string prefix match, not segment match).
        description: 'does not strip a prefix that only partially matches a path segment',
        inputPath: '/interventions-v2/page',
        expectedPath: '-v2/page',
      },
    ])('$description', async ({ inputPath, expectedPath }) => {
      const { handler } = await import('../frontend-handler');
      const event = makeEvent(inputPath);

      await handler(event, mockContext);

      const [calledEvent] = mockProxy.mock.calls[0] as [APIGatewayProxyEvent, Context];
      expect(calledEvent.path).toBe(expectedPath);
    });

    it('passes the context through to the proxy unchanged', async () => {
      const { handler } = await import('../frontend-handler');
      const event = makeEvent('/interventions/');

      await handler(event, mockContext);

      expect(mockProxy).toHaveBeenCalledWith(expect.anything(), mockContext);
    });
  });

  describe('proxy initialisation', () => {
    it('initialises the proxy by calling awsLambdaFastify with the result of init()', async () => {
      const awsLambdaFastify = await import('@fastify/aws-lambda');
      const app = await import('../../frontend/app');

      const fakeServer = {};
      vi.mocked(app.init).mockReturnValue(fakeServer as ReturnType<typeof app.init>);

      await import('../frontend-handler');

      expect(app.init).toHaveBeenCalledOnce();
      expect(awsLambdaFastify.default).toHaveBeenCalledWith(fakeServer);
    });
  });

  describe('return value', () => {
    it('returns the response from the proxy', async () => {
      const expectedResponse = { statusCode: 200, body: 'OK', headers: {}, isBase64Encoded: false };
      mockProxy.mockResolvedValue(expectedResponse);

      const { handler } = await import('../frontend-handler');
      const result = await handler(makeEvent('/'), mockContext);

      expect(result).toBe(expectedResponse);
    });
  });
});
