import { Mock } from 'vitest';
import logger from '../../commons/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { MetricNames } from '../../data-types/constants';
import { DEFAULT_SCAN_LIMIT, processTtlBackfill, UPDATE_CONCURRENCY } from '../ttl-backfill';
import { InMemoryTtlBackfillService, InterventionEventKey } from '../../services/ttl-backfill-service';

vi.mock('../../commons/logger');
vi.mock('@aws-lambda-powertools/metrics');

// eslint-disable-next-line @typescript-eslint/unbound-method
const mockAddMetric = Metrics.prototype.addMetric as Mock;
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockPublishStoredMetrics = Metrics.prototype.publishStoredMetrics as Mock;
const loggerErrorSpy = vi.spyOn(logger, 'error');

// An arbitrary far-future epoch-seconds value (year 2286). It has no significance beyond being
// comfortably more than one year ahead, so it always passes the minimum-runway TTL check.
const ARBITRARY_FUTURE_TTL = 9999999999;

function buildKeys(count: number): InterventionEventKey[] {
  return Array.from({ length: count }, (_value, index) => ({
    accountId: `account-${index.toString()}`,
    createdAt: 1000 + index,
  }));
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('processTtlBackfill', () => {
  // Goal: with a valid event and a page of rows, apply the TTL to every row and report completion.
  test('applies the ttl to every scanned key and reports completion', async () => {
    const keys = buildKeys(3);
    const service = new InMemoryTtlBackfillService({ keys, scannedCount: 10 });

    const report = await processTtlBackfill(
      { windowStartMs: 1000, windowEndMs: 2000, ttl: ARBITRARY_FUTURE_TTL },
      { service },
    );

    expect(report).toEqual({
      scannedCount: 10,
      matchedCount: 3,
      updatedCount: 3,
      complete: true,
    });
    expect(service.appliedKeys).toEqual(keys);
    expect(mockAddMetric).toHaveBeenCalledWith(MetricNames.TTL_BACKFILL_ROWS_UPDATED, 'Count', 3);
  });

  // Goal: when limit is omitted, the default page size is used; window is passed through unchanged.
  test('defaults the scan limit and forwards the window', async () => {
    const service = new InMemoryTtlBackfillService({ keys: [], scannedCount: 0 });

    await processTtlBackfill({ windowStartMs: 1000, windowEndMs: 2000, ttl: ARBITRARY_FUTURE_TTL }, { service });

    expect(service.lastScanParameters).toEqual({
      windowStartMs: 1000,
      windowEndMs: 2000,
      limit: DEFAULT_SCAN_LIMIT,
    });
  });

  // Goal: an explicit limit and resume key are forwarded, and an unfinished scan reports the resume key.
  test('forwards limit and exclusive start key and reports the resume point when incomplete', async () => {
    const lastEvaluatedKey = { accountId: 'account-9', createdAt: 1900 };
    const service = new InMemoryTtlBackfillService({ keys: buildKeys(1), scannedCount: 1, lastEvaluatedKey });

    const report = await processTtlBackfill(
      {
        windowStartMs: 1000,
        windowEndMs: 2000,
        ttl: ARBITRARY_FUTURE_TTL,
        limit: 500,
        exclusiveStartKey: { accountId: 'account-5', createdAt: 1500 },
      },
      { service },
    );

    expect(service.lastScanParameters).toEqual({
      windowStartMs: 1000,
      windowEndMs: 2000,
      limit: 500,
      exclusiveStartKey: { accountId: 'account-5', createdAt: 1500 },
    });
    expect(report.complete).toBe(false);
    expect(report.lastEvaluatedKey).toEqual(lastEvaluatedKey);
  });

  // Goal: rows that already gained a ttl (conditional write fails) are attempted but not counted as updated.
  test('counts only rows that were actually updated', async () => {
    const keys = buildKeys(3);
    const service = new InMemoryTtlBackfillService({ keys, scannedCount: 3 }, new Set(['account-1']));

    const report = await processTtlBackfill(
      { windowStartMs: 1000, windowEndMs: 2000, ttl: ARBITRARY_FUTURE_TTL },
      { service },
    );

    expect(report.matchedCount).toBe(3);
    expect(report.updatedCount).toBe(2);
    expect(service.appliedKeys).toHaveLength(3);
  });

  // Goal: a page larger than the concurrency bound is fully processed across multiple batches.
  test('processes pages larger than the concurrency bound', async () => {
    const keys = buildKeys(UPDATE_CONCURRENCY + 5);
    const service = new InMemoryTtlBackfillService({ keys, scannedCount: keys.length });

    const report = await processTtlBackfill(
      { windowStartMs: 1000, windowEndMs: 2000, ttl: ARBITRARY_FUTURE_TTL },
      { service },
    );

    expect(report.updatedCount).toBe(keys.length);
    expect(service.appliedKeys).toHaveLength(keys.length);
  });

  // Goal: an inverted window is rejected at the boundary, records a metric, and does not scan.
  test('rejects an event whose window end precedes its start', async () => {
    const service = new InMemoryTtlBackfillService({ keys: [], scannedCount: 0 });

    await expect(
      processTtlBackfill({ windowStartMs: 2000, windowEndMs: 1000, ttl: ARBITRARY_FUTURE_TTL }, { service }),
    ).rejects.toThrow('Invalid TTL backfill event');

    expect(mockAddMetric).toHaveBeenCalledWith(MetricNames.TTL_BACKFILL_INVALID_EVENT, 'Count', 1);
    expect(mockPublishStoredMetrics).toHaveBeenCalled();
    expect(service.lastScanParameters).toBeUndefined();
    expect(loggerErrorSpy).toHaveBeenCalled();
  });

  // Goal: a structurally invalid event (missing required fields) is rejected before scanning.
  test('rejects an event missing required fields', async () => {
    const service = new InMemoryTtlBackfillService({ keys: [], scannedCount: 0 });

    await expect(processTtlBackfill({ windowStartMs: 1000 }, { service })).rejects.toThrow(
      'Invalid TTL backfill event',
    );
    expect(service.lastScanParameters).toBeUndefined();
  });

  // Goal: a limit above the maximum is rejected so a single invocation cannot run unboundedly.
  test('rejects a limit above the maximum', async () => {
    const service = new InMemoryTtlBackfillService({ keys: [], scannedCount: 0 });

    await expect(
      processTtlBackfill(
        { windowStartMs: 1000, windowEndMs: 2000, ttl: ARBITRARY_FUTURE_TTL, limit: 5000 },
        { service },
      ),
    ).rejects.toThrow('Invalid TTL backfill event');
  });

  // Goal: the required ttl is enforced at the boundary — an otherwise-valid event with no ttl is
  // rejected before any scan runs, so a backfill can never write without an explicit TTL.
  test('rejects an event missing the ttl', async () => {
    const service = new InMemoryTtlBackfillService({ keys: [], scannedCount: 0 });

    await expect(
      processTtlBackfill({ windowStartMs: 1000, windowEndMs: 2000 }, { service }),
    ).rejects.toThrow('Invalid TTL backfill event');
    expect(service.lastScanParameters).toBeUndefined();
  });

  // Goal: a ttl less than one year ahead is rejected at the boundary, guarding against a
  // fat-fingered value that would schedule rows for near-term DynamoDB TTL deletion; no scan runs.
  test('rejects a ttl less than one year in the future', async () => {
    const service = new InMemoryTtlBackfillService({ keys: [], scannedCount: 0 });
    const oneMinuteAheadSeconds = Math.floor(Date.now() / 1000) + 60;

    await expect(
      processTtlBackfill({ windowStartMs: 1000, windowEndMs: 2000, ttl: oneMinuteAheadSeconds }, { service }),
    ).rejects.toThrow('Invalid TTL backfill event');
    expect(service.lastScanParameters).toBeUndefined();
  });
});
