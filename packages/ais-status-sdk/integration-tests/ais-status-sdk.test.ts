import { InterventionClient } from '../src/index';
import { createTestServer, TestServer } from './test-server';
import { InterventionRequestFailed, InterventionInvalidResponse } from '../src/errors';

describe('Test InterventionClient (Integration Tests)', () => {
  let testServer: TestServer;

  afterEach(async () => {
    await testServer.stop();
  });

  it('returns interventions for a known user', async () => {
    testServer = await createTestServer({
      accounts: {
        'user-1234': { interventions: [{ name: 'RESET_PASSWORD' }] },
      },
    });

    const client = new InterventionClient({ baseUrl: testServer.baseUrl });
    const result = await client.getAccountStatus('user-1234');

    expect(result.interventions).toEqual([{ name: 'RESET_PASSWORD' }]);
  });

  it('returns interventions for different users', async () => {
    testServer = await createTestServer({
      accounts: {
        'user-1234': { interventions: [{ name: 'RESET_PASSWORD' }] },
        'user-5678': { interventions: [{ name: 'TEMPORARY_SUSPENSION' }] },
      },
    });

    const client = new InterventionClient({ baseUrl: testServer.baseUrl });
    
    const resultOne = await client.getAccountStatus('user-1234');
    expect(resultOne.interventions).toEqual([{ name: 'RESET_PASSWORD' }]);

    const resultTwo = await client.getAccountStatus('user-5678');
    expect(resultTwo.interventions).toEqual([{ name: 'TEMPORARY_SUSPENSION' }]);
  });
  
  it('throw InterventionRequestFailed when response is NOT ok', async () => {
    testServer = await createTestServer({
      accounts: {
        'user-1234': { interventions: [{ name: 'RESET_PASSWORD' }] },
        'user-5678': { interventions: [{ name: 'TEMPORARY_SUSPENSION' }] },
      },
      simulateServerError: true,
    });

    const client = new InterventionClient({ baseUrl: testServer.baseUrl });
    await expect(client.getAccountStatus('user-1234')).rejects.toThrow(InterventionRequestFailed);
  });

  it('throw InterventionInvalidResponse when response does not match schema', async () => {
    testServer = await createTestServer({
      accounts: {
        'user-1234': { test: 'test' },
      }
    });

    const client = new InterventionClient({ baseUrl: testServer.baseUrl });
    await expect(client.getAccountStatus('user-1234')).rejects.toThrow(InterventionInvalidResponse);
  });

  it('throws when the connection from the server drops', async () => {
    testServer = await createTestServer({ accounts: {} });
  
    const client = new InterventionClient({ baseUrl: testServer.baseUrl });
    // Stop server to simulate connection being dropped
    await testServer.stop();
  
    await expect(client.getAccountStatus('user-1234')).rejects.toThrow();
  });
})
