import { init } from '../app';
import { InterventionStub, InterventionName, InterventionState } from '@govuk-one-login/ais-status-sdk';
import { StubAuthoriser } from '../authoriser';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

vi.mock('@aws-lambda-powertools/logger');

type InitArgs = Parameters<typeof init>;

// Initialise the server with a StubAuthoriser and decorate awsLambda so that
// server.inject() requests satisfy the onRequest auth hook without a real Lambda event.
function initWithStubAuth(...args: InitArgs) {
  const server = init(...args);
  server.decorateRequest('awsLambda', {
    getter: () =>
      ({ event: { requestContext: { authorizer: {} } }, context: {} }) as {
        event: APIGatewayProxyEvent;
        context: Context;
      },
  });
  return server;
}

// These snapshot tests pin the full rendered HTML of each page so that any
// unintended change to a template (or the data threaded into it) is caught.
// The output is deterministic in the test environment: STAGE_PREFIX/SUBPATH are
// unset, no nonce is threaded through, and history dates are formatted in UTC.
describe('rendered page snapshots', () => {
  // Goal: pin the search/landing page markup. Method: request GET / and snapshot the body.
  it('renders the index page', async () => {
    const server = initWithStubAuth(
      new InterventionStub({ result: { interventions: [] } }),
      undefined,
      undefined,
      new StubAuthoriser(),
    );

    const response = await server.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchSnapshot();
  });

  // Goal: pin the user-details page markup for an account with a single historical
  // intervention. Method: stub the client with a fixed history line (fixed sentAt so
  // the formatted date is stable) and snapshot the body.
  it('renders the user details page with history', async () => {
    const server = initWithStubAuth(
      new InterventionStub({
        interventionNames: [InterventionName.PERMANENT_SUSPENSION],
        historyResult: {
          lines: [
            {
              sentAt: 1784021279000,
              componentId: 'TEST',
              interventionName: InterventionName.TEMPORARY_SUSPENSION,
              interventionState: InterventionState.ACTIVE,
              interventionReason: 'Reason',
              interventionCode: '01',
              originatingComponent: 'TICF',
              requesterId: 'interventions@digital.cabinet-office.gov.uk',
              tagId: 'abc1234',
            },
          ],
        },
      }),
      undefined,
      undefined,
      new StubAuthoriser(),
    );

    const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchSnapshot();
  });

  // Goal: pin the user-details page markup for an account with no interventions and
  // no history. Method: stub an empty account and snapshot the body.
  it('renders the user details page with no interventions', async () => {
    const server = initWithStubAuth(
      new InterventionStub({ result: { interventions: [] }, historyResult: { lines: [] } }),
      undefined,
      undefined,
      new StubAuthoriser(),
    );

    const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchSnapshot();
  });
});
