import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterventionClient } from './index';
import { InterventionInvalidResponse } from './errors';

const mockFetch = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('InterventionClient', () => {
  const baseUrl = 'https://example.com';

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getAccountStatus', () => {
    it('calls the v2 endpoint with the encoded userId', async () => {
      const client = new InterventionClient({ baseUrl });

      const userId = 'urn:fdc:gov.uk:2022:user123';
      mockFetch.mockResolvedValue(mockResponse({ interventions: [] }));

      await client.getAccountStatus(userId);

      const [calledUrl, calledOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toBe(`${baseUrl}/v2/ais/${encodeURIComponent(userId)}`);
      expect(new Headers(calledOptions.headers).get('Content-Type')).toBe('application/json');
    });

    it('returns the parsed AccountStatus', async () => {
      const client = new InterventionClient({ baseUrl });

      const status = { interventions: [{ name: 'FRAUD_SUSPEND_ACCOUNT' }] };
      mockFetch.mockResolvedValue(mockResponse(status));

      const result = await client.getAccountStatus('user-1');

      expect(result).toEqual(status);
    });

    it('throws when the response is not ok', async () => {
      const client = new InterventionClient({ baseUrl });

      mockFetch.mockResolvedValue(mockResponse({}, 404));

      await expect(client.getAccountStatus('user-1')).rejects.toThrow('AIS request failed: 404');
    });

    it('throws AisInvalidResponse when the response body does not match the schema', async () => {
      const client = new InterventionClient({ baseUrl });

      mockFetch.mockResolvedValue(mockResponse({ unexpected: 'shape' }));

      await expect(client.getAccountStatus('user-1')).rejects.toThrow(InterventionInvalidResponse);
    });

    it('strips trailing slash from baseUrl', async () => {
      const clientWithSlash = new InterventionClient({ baseUrl: 'https://example.com/' });
      mockFetch.mockResolvedValue(mockResponse({ interventions: [] }));

      await clientWithSlash.getAccountStatus('user-1');

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/v2/ais/user-1', expect.anything());
    });
  });
});
