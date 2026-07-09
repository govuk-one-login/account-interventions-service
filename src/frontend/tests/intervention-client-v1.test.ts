import { InterventionClientV1, InterventionStubV1 } from '../intervention-client-v1';
import { AISInterventionTypes } from '../../data-types/constants';
import { V1Response } from '../../data-types/api-schemas-v1';

const baseV1Response: V1Response = {
  intervention: {
    updatedAt: 1_700_000_000_000,
    appliedAt: 1_700_000_000_000,
    sentAt: 1_700_000_000_000,
    description: AISInterventionTypes.AIS_NO_INTERVENTION,
  },
  state: {
    blocked: false,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
  },
  auditLevel: 'standard',
};

const baseV1ResponseWithHistory: V1Response = {
  ...baseV1Response,
  history: [
    {
      sentAt: '2026-06-10T13:39:18.648Z',
      component: 'TEST_EATL',
      code: '01',
      intervention: 'FRAUD_SUSPEND_ACCOUNT',
      reason: '03',
      originatingComponent: 'TEST_EATL',
      requesterId: 'test-requester@example.com',
    },
  ],
};

// ---------------------------------------------------------------------------
// InterventionStubV1
// ---------------------------------------------------------------------------

describe('InterventionStubV1', () => {
  it('resolves with the output passed to the constructor', async () => {
    const stub = new InterventionStubV1(baseV1Response);
    await expect(stub.getAccountHistory('any-user-id')).resolves.toEqual(baseV1Response);
  });

  it('ignores the userId argument and always returns the configured output', async () => {
    const stub = new InterventionStubV1(baseV1Response);
    const result1 = await stub.getAccountHistory('user-1');
    const result2 = await stub.getAccountHistory('user-2');
    expect(result1).toEqual(result2);
  });

  it('returns responses that include a history array when constructed with one', async () => {
    const stub = new InterventionStubV1(baseV1ResponseWithHistory);
    const result = await stub.getAccountHistory('user-id');
    expect(result.history).toHaveLength(1);
    expect(result.history?.[0]?.intervention).toBe('FRAUD_SUSPEND_ACCOUNT');
  });

  it('exposes the output on the readonly output property', () => {
    const stub = new InterventionStubV1(baseV1Response);
    expect(stub.output).toEqual(baseV1Response);
  });
});

// ---------------------------------------------------------------------------
// InterventionClientV1
// ---------------------------------------------------------------------------

describe('InterventionClientV1', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('when STATUS_API_URL is not set', () => {
    it('throws an error with a descriptive message', async () => {
      vi.stubEnv('STATUS_API_URL', '');
      const client = new InterventionClientV1();
      await expect(client.getAccountHistory('test-user')).rejects.toThrow(
        'Environment variable STATUS_API_URL not found',
      );
    });
  });

  describe('when STATUS_API_URL is set', () => {
    beforeEach(() => {
      vi.stubEnv('STATUS_API_URL', 'https://api.example.com');
    });

    it('calls the correct URL for a simple userId', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () => Promise.resolve(baseV1Response),
        }),
      );

      const client = new InterventionClientV1();
      await client.getAccountHistory('simple-user-id');

      expect(fetch).toHaveBeenCalledWith('https://api.example.com/v1/ais/simple-user-id?history=true');
    });

    it('URL-encodes the userId in the request URL', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () => Promise.resolve(baseV1Response),
        }),
      );

      const client = new InterventionClientV1();
      await client.getAccountHistory('urn:fdc:gov.uk:2022:abc123');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/ais/urn%3Afdc%3Agov.uk%3A2022%3Aabc123?history=true',
      );
    });

    it('strips a trailing slash from the base URL before appending the path', async () => {
      vi.stubEnv('STATUS_API_URL', 'https://api.example.com/');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () => Promise.resolve(baseV1Response),
        }),
      );

      const client = new InterventionClientV1();
      await client.getAccountHistory('user-id');

      expect(fetch).toHaveBeenCalledWith('https://api.example.com/v1/ais/user-id?history=true');
    });

    it('returns the parsed V1Response when the API response is valid', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () => Promise.resolve(baseV1Response),
        }),
      );

      const client = new InterventionClientV1();
      const result = await client.getAccountHistory('user-id');

      expect(result).toEqual(baseV1Response);
    });

    it('returns a response with history when the API includes it', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () => Promise.resolve(baseV1ResponseWithHistory),
        }),
      );

      const client = new InterventionClientV1();
      const result = await client.getAccountHistory('user-id');

      expect(result.history).toHaveLength(1);
      expect(result.history?.[0]?.sentAt).toBe('2026-06-10T13:39:18.648Z');
    });

    it('applies the Zod default auditLevel of "standard" when it is absent from the response', async () => {
      const { auditLevel: _auditLevel, ...responseWithoutAuditLevel } = baseV1Response;
      void _auditLevel;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () => Promise.resolve(responseWithoutAuditLevel),
        }),
      );

      const client = new InterventionClientV1();
      const result = await client.getAccountHistory('user-id');

      expect(result.auditLevel).toBe('standard');
    });

    it('throws an "AIS Invalid Response" error when the response body fails schema validation', async () => {
      const invalidResponse = { unexpected: 'shape' };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () => Promise.resolve(invalidResponse),
        }),
      );

      const client = new InterventionClientV1();
      await expect(client.getAccountHistory('user-id')).rejects.toThrow('AIS Invalid Response');
    });

    it('includes the Zod error as the cause when schema validation fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () => Promise.resolve({ unexpected: 'shape' }),
        }),
      );

      const client = new InterventionClientV1();
      await expect(client.getAccountHistory('user-id')).rejects.toThrow(Error);
    });

    it('propagates network errors thrown by fetch', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network timeout')));

      const client = new InterventionClientV1();
      await expect(client.getAccountHistory('user-id')).rejects.toThrow('network timeout');
    });

    it('getAccountHistory delegates to fetchAccountHistory', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () => Promise.resolve(baseV1Response),
        }),
      );

      const client = new InterventionClientV1();
      const fetchSpy = vi.spyOn(client, 'fetchAccountHistory');

      await client.getAccountHistory('user-id');

      expect(fetchSpy).toHaveBeenCalledWith('user-id');
    });
  });
});
