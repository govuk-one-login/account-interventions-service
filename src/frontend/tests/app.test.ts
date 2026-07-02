import { init } from '../app';

describe('frontend app', () => {
  it('returns 200 for GET /', async () => {
    const server = init();
    const response = await server.inject({ method: 'GET', url: '/' });
    expect(response.statusCode).toBe(200);
  });

  it('returns HTML containing the page heading', async () => {
    const server = init();
    const response = await server.inject({ method: 'GET', url: '/' });
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.body).toContain('Account Interventions Service');
  });

  it('returns 404 for unknown routes', async () => {
    const server = init();
    const response = await server.inject({ method: 'GET', url: '/unknown' });
    expect(response.statusCode).toBe(404);
  });
});
