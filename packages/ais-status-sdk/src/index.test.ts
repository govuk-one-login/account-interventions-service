import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterventionClient } from './index';
import { InterventionInvalidResponse } from './errors';
import type { HistoryLine } from './types';
import { InterventionName, InterventionState } from './types';
import { ZodError } from 'zod';

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

function makeHistoryObject(overrides: Partial<HistoryLine> = {}): HistoryLine {
  return {
    sentAt: 1_696_869_003_456,
    componentId: 'TICF_CRI',
    interventionName: InterventionName.PERMANENT_SUSPENSION,
    interventionState: InterventionState.ACTIVE,
    interventionReason: 'suspend account due to fraud',
    tagId: 'abc123',
    ...overrides,
  };
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

  describe('getAccountHistory', () => {
    it('calls the v2 history endpoint with the encoded userId', async () => {
      const client = new InterventionClient({ baseUrl });

      const userId = 'urn:fdc:gov.uk:2022:user123';
      mockFetch.mockResolvedValue(mockResponse({ lines: [] }));

      await client.getAccountHistory(userId);

      const [calledUrl, calledOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toBe(`${baseUrl}/v2/ais/${encodeURIComponent(userId)}/history`);
      expect(new Headers(calledOptions.headers).get('Content-Type')).toBe('application/json');
    });

    it('returns an empty history array when there are no history entries', async () => {
      const client = new InterventionClient({ baseUrl });

      mockFetch.mockResolvedValue(mockResponse({ lines: [] }));

      const result = await client.getAccountHistory('user-1');

      expect(result).toEqual({ lines: [] });
    });

    it('returns the parsed AccountHistory with a single entry', async () => {
      const client = new InterventionClient({ baseUrl });

      const historyEntry = makeHistoryObject();
      mockFetch.mockResolvedValue(mockResponse({ lines: [historyEntry] }));

      const result = await client.getAccountHistory('user-1');

      expect(result).toEqual({ lines: [historyEntry] });
    });

    it('returns history with multiple entries in order', async () => {
      const client = new InterventionClient({ baseUrl });

      const entries = [
        makeHistoryObject({ sentAt: 1_696_869_003_000, interventionName: InterventionName.PERMANENT_SUSPENSION }),
        makeHistoryObject({ sentAt: 1_696_869_004_000, interventionName: InterventionName.TEMPORARY_SUSPENSION }),
        makeHistoryObject({ sentAt: 1_696_869_005_000, interventionName: InterventionName.REPROVE_IDENTITY }),
      ];
      mockFetch.mockResolvedValue(mockResponse({ lines: entries }));

      const result = await client.getAccountHistory('user-1');

      expect(result.lines).toHaveLength(3);
      expect(result.lines).toEqual(entries);
    });

    it('returns history entries with all optional fields present', async () => {
      const client = new InterventionClient({ baseUrl });

      const fullEntry = makeHistoryObject({
        interventionCode: '01',
        originatingComponent: 'CMS',
        originatorReferenceId: 'ref-abc-123',
        requesterId: 'requester-xyz',
        transactionId: 'txn-456',
        messageEventId: 'msg-789',
      });
      mockFetch.mockResolvedValue(mockResponse({ lines: [fullEntry] }));

      const result = await client.getAccountHistory('user-1');

      expect(result.lines[0]).toEqual(fullEntry);
    });

    it('returns history entries where originatorReferenceId is an array', async () => {
      const client = new InterventionClient({ baseUrl });

      const entry = makeHistoryObject({ originatorReferenceId: ['ref-1', 'ref-2'] });
      mockFetch.mockResolvedValue(mockResponse({ lines: [entry] }));

      const result = await client.getAccountHistory('user-1');

      expect(result.lines[0]?.originatorReferenceId).toEqual(['ref-1', 'ref-2']);
    });

    it('returns history entries with all known interventionState values', async () => {
      const client = new InterventionClient({ baseUrl });

      const entries = Object.values(InterventionState).map((state) => makeHistoryObject({ interventionState: state }));
      mockFetch.mockResolvedValue(mockResponse({ lines: entries }));

      const result = await client.getAccountHistory('user-1');

      const returnedStates = result.lines.map((h) => h.interventionState);
      expect(returnedStates).toEqual(Object.values(InterventionState));
    });

    it('throws InterventionRequestFailed when the response is not ok (404)', async () => {
      const client = new InterventionClient({ baseUrl });

      mockFetch.mockResolvedValue(mockResponse({}, 404));

      await expect(client.getAccountHistory('user-1')).rejects.toThrow('AIS request failed: 404');
    });

    it('throws InterventionRequestFailed when the response is not ok (500)', async () => {
      const client = new InterventionClient({ baseUrl });

      mockFetch.mockResolvedValue(mockResponse({}, 500));

      await expect(client.getAccountHistory('user-1')).rejects.toThrow('AIS request failed: 500');
    });

    it('throws InterventionInvalidResponse when the response body is missing the history key', async () => {
      const client = new InterventionClient({ baseUrl });

      mockFetch.mockResolvedValue(mockResponse({ unexpected: 'shape' }));

      await expect(client.getAccountHistory('user-1')).rejects.toThrow(InterventionInvalidResponse);
    });

    it('throws InterventionInvalidResponse when a history entry is missing a required field', async () => {
      const client = new InterventionClient({ baseUrl });

      // Missing required `interventionReason`
      const invalidEntry = { sentAt: 1_696_869_003_456, componentId: 'TICF_CRI' };
      mockFetch.mockResolvedValue(mockResponse({ lines: [invalidEntry] }));

      await expect(client.getAccountHistory('user-1')).rejects.toThrow(InterventionInvalidResponse);
    });

    it('throws InterventionInvalidResponse when a history entry has an invalid interventionName', async () => {
      const client = new InterventionClient({ baseUrl });

      const invalidEntry = makeHistoryObject({ interventionName: 'NOT_A_VALID_INTERVENTION' as InterventionName });
      mockFetch.mockResolvedValue(mockResponse({ lines: [invalidEntry] }));

      await expect(client.getAccountHistory('user-1')).rejects.toThrow(InterventionInvalidResponse);
    });

    it('throws InterventionInvalidResponse when a history entry has an invalid interventionState', async () => {
      const client = new InterventionClient({ baseUrl });

      const invalidEntry = makeHistoryObject({ interventionState: 'NOT_A_VALID_STATE' as InterventionState });
      mockFetch.mockResolvedValue(mockResponse({ lines: [invalidEntry] }));

      await expect(client.getAccountHistory('user-1')).rejects.toThrow(InterventionInvalidResponse);
    });

    it('logs the error when the response is not ok', async () => {
      const logger = { error: vi.fn() };
      const client = new InterventionClient({ baseUrl, logger });

      mockFetch.mockResolvedValue(mockResponse({}, 503));

      await expect(client.getAccountHistory('user-1')).rejects.toThrow('AIS request failed: 503');
      expect(logger.error).toHaveBeenCalledWith('AIS request failed: 503 Error');
    });

    it('logs the error when the response body does not match the schema', async () => {
      const logger = { error: vi.fn() };
      const client = new InterventionClient({ baseUrl, logger });

      mockFetch.mockResolvedValue(mockResponse({ unexpected: 'shape' }));

      await expect(client.getAccountHistory('user-1')).rejects.toThrow(InterventionInvalidResponse);
      expect(logger.error).toHaveBeenCalledWith(
        'AIS Invalid Response',
        expect.objectContaining({ cause: expect.anything() as ZodError<object> }),
      );
    });

    it('strips trailing slash from baseUrl on history requests', async () => {
      const clientWithSlash = new InterventionClient({ baseUrl: 'https://example.com/' });
      mockFetch.mockResolvedValue(mockResponse({ lines: [] }));

      await clientWithSlash.getAccountHistory('user-1');

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/v2/ais/user-1/history', expect.anything());
    });
  });
});
