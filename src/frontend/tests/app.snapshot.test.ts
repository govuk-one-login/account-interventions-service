import { init } from '../app';
import { InterventionStub, InterventionName, InterventionState } from '@govuk-one-login/ais-status-sdk';
import { StubAuthoriser } from '../authoriser';
import { StubMessageService } from '../../services/message-service';
import { FeatureFlagsStub } from '../../services/feature-flags';

vi.mock('@aws-lambda-powertools/logger');

// These snapshot tests pin the full rendered HTML of each page so that any
// unintended change to a template (or the data threaded into it) is caught.
// The output is deterministic in the test environment: STAGE_PREFIX/SUBPATH are
// unset, no nonce is threaded through, and history dates are formatted in UTC.
describe('rendered page snapshots', () => {
  // Goal: pin the search/landing page markup. Method: request GET / and snapshot the body.
  it('renders the index page', async () => {
    const server = init(
      {
        interventionClient: new InterventionStub({ result: { interventions: [] } }),
        messageService: new StubMessageService(),
        authoriser: new StubAuthoriser(),
        config: {},
      },
      {
        featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
      },
    );

    const response = await server.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchSnapshot();
  });

  // Goal: pin the search/landing page markup. Method: request GET / and snapshot the body.
  // ensure that the asset path is correct
  it('renders the index page correct when subpath and stagePrefix are set in config', async () => {
    const server = init(
      {
        interventionClient: new InterventionStub({ result: { interventions: [] } }),
        messageService: new StubMessageService(),
        authoriser: new StubAuthoriser(),
        config: {
          subpath: '/interventions',
          stagePrefix: '/v1',
        },
      },
      {
        featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
      },
    );

    const response = await server.inject({ method: 'GET', url: '/' });
    console.log(response.body);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchSnapshot();
  });

  // Goal: pin the user-details page markup for an account with a single historical
  // intervention. Method: stub the client with a fixed history line (fixed sentAt so
  // the formatted date is stable) and snapshot the body.
  it('renders the user details page with history', async () => {
    const server = init(
      {
        interventionClient: new InterventionStub({
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
        messageService: new StubMessageService(),
        authoriser: new StubAuthoriser(),
        config: {},
      },

      {
        featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
      },
    );

    const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchSnapshot();
  });

  // Goal: pin the user-details page markup for an account with multiple historical
  // interventions. Method: stub the client with a fixed history line and snapshot the body.
  // This test should have all the various intervention tags such as Automated, Manual, Source Unknown
  it('renders the user details page with multiple interventions in history', async () => {
    const server = init(
      {
        interventionClient: new InterventionStub({
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
                originatingComponent: 'SIRA',
                requesterId: 'interventions@digital.cabinet-office.gov.uk',
                tagId: 'tag1',
              },
              {
                sentAt: 1784022279000,
                componentId: 'TEST',
                interventionName: InterventionName.TEMPORARY_SUSPENSION,
                interventionState: InterventionState.SUPERSEDED,
                interventionReason: 'Reason',
                interventionCode: '03',
                originatingComponent: 'TICF_FAI',
                requesterId: 'interventions@digital.cabinet-office.gov.uk',
                tagId: 'tag2',
              },
              {
                sentAt: 1784022279000,
                componentId: 'TEST',
                interventionName: InterventionName.RESET_PASSWORD,
                interventionState: InterventionState.ACTIVE,
                interventionReason: 'Reason',
                interventionCode: '03',
                originatingComponent: 'CMS',
                requesterId: 'interventions@digital.cabinet-office.gov.uk',
                tagId: 'tag3',
              },
              {
                sentAt: 1774022279000,
                componentId: 'TEST',
                interventionName: InterventionName.RESET_PASSWORD,
                interventionState: InterventionState.ACTIVE,
                interventionReason: 'Reason not supported',
                interventionCode: '03',
                originatingComponent: 'TICF',
                requesterId: 'interventions@digital.cabinet-office.gov.uk',
                tagId: 'tag4',
              },
              {
                sentAt: 1774022279000,
                componentId: 'TEST',
                interventionName: InterventionName.RESET_PASSWORD,
                interventionState: InterventionState.ACTIVE,
                interventionReason: 'Reason not supported',
                interventionCode: '03',
                originatingComponent: '',
                requesterId: 'interventions@digital.cabinet-office.gov.uk',
                tagId: 'tag5',
              },
            ],
          },
        }),
        messageService: new StubMessageService(),
        authoriser: new StubAuthoriser(),
        config: {},
      },
      {
        featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
      },
    );

    const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchSnapshot();
  });

  // Goal: pin the user-details page markup for an account with no interventions and
  // no history. Method: stub an empty account and snapshot the body.
  it('renders the user details page with no interventions', async () => {
    const server = init(
      {
        interventionClient: new InterventionStub({ result: { interventions: [] } }),
        messageService: new StubMessageService(),
        authoriser: new StubAuthoriser(),
        config: {},
      },
      {
        featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
      },
    );

    const response = await server.inject({ method: 'GET', url: '/user/test-user-id' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchSnapshot();
  });
});
