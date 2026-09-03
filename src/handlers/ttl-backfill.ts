import { z, prettifyError } from 'zod';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';
import logger from '../commons/logger';
import { addMetric, metric } from '../commons/metrics';
import { LOGS_PREFIX_SENSITIVE_INFO, MetricNames } from '../data-types/constants';
import { InterventionEventKey, ScanForBackfillParameters, TtlBackfillService } from '../services/ttl-backfill-service';

/**
 * The largest number of rows a single invocation may evaluate. It bounds the scan page and, with
 * the concurrency limit below, the work done per invocation so the lambda cannot run unboundedly.
 */
export const MAX_SCAN_LIMIT = 1000;

/**
 * The default scan page size when the event omits `limit`. Kept small so a first exploratory run
 * is cheap; operators can raise it up to MAX_SCAN_LIMIT once they trust the window.
 */
export const DEFAULT_SCAN_LIMIT = 100;

/**
 * How many UpdateItem calls run concurrently. Bounding this keeps the lambda from issuing an
 * unbounded burst of writes against DynamoDB when a page is large.
 */
export const UPDATE_CONCURRENCY = 25;

/**
 * The minimum runway a supplied TTL must have: 365 days = 31,536,000 seconds. The TTL is written
 * straight onto the row's `ttl` attribute, which drives DynamoDB TTL deletion, so a past or
 * near-term value would schedule rows for deletion almost immediately. Requiring a full year of
 * runway guards against a fat-fingered invocation deleting live data.
 */
export const MINIMUM_TTL_OFFSET_SECONDS = 31_536_000;

/**
 * The manual invocation event. It is validated at the boundary per ADR 003 / ADR 007: nothing
 * about a hand-crafted invocation payload can be trusted until parsed. `limit` and
 * `exclusiveStartKey` are optional so the first run can omit them and resume runs can supply them.
 * `ttl` is required: an absolute Unix epoch-seconds timestamp written onto each matched row, which
 * must be at least one year in the future (see MINIMUM_TTL_OFFSET_SECONDS).
 */
const backfillEventSchema = z
  .object({
    windowStartMs: z.number().int().nonnegative(),
    windowEndMs: z.number().int().nonnegative(),
    ttl: z.number().int().positive(),
    limit: z.number().int().positive().max(MAX_SCAN_LIMIT).optional(),
    exclusiveStartKey: z
      .object({
        accountId: z.string().min(1),
        createdAt: z.number().int().nonnegative(),
      })
      .optional(),
  })
  .refine((event) => event.windowEndMs >= event.windowStartMs, {
    message: 'windowEndMs must be greater than or equal to windowStartMs',
    path: ['windowEndMs'],
  })
  .refine((event) => event.ttl >= getCurrentTimestamp().seconds + MINIMUM_TTL_OFFSET_SECONDS, {
    message: 'ttl must be at least one year (31536000 seconds) in the future',
    path: ['ttl'],
  });

export type BackfillEvent = z.infer<typeof backfillEventSchema>;

/**
 * The outcome of one invocation. `lastEvaluatedKey` is present only when more rows remain; feed it
 * back in as `exclusiveStartKey` to continue. `complete` is true once the whole window is scanned.
 */
export interface BackfillReport {
  scannedCount: number;
  matchedCount: number;
  updatedCount: number;
  lastEvaluatedKey?: InterventionEventKey;
  complete: boolean;
}

export interface BackfillOptions {
  service: TtlBackfillService;
}

/**
 * Validate the event, scan one page of rows missing a TTL within the window, apply the configured
 * TTL to each, and report progress so the run can be resumed.
 */
export async function processTtlBackfill(event: unknown, options: BackfillOptions): Promise<BackfillReport> {
  const parsedEvent = parseBackfillEvent(event);
  const limit = parsedEvent.limit ?? DEFAULT_SCAN_LIMIT;

  const scanParameters: ScanForBackfillParameters = {
    windowStartMs: parsedEvent.windowStartMs,
    windowEndMs: parsedEvent.windowEndMs,
    limit,
    ...(parsedEvent.exclusiveStartKey && { exclusiveStartKey: parsedEvent.exclusiveStartKey }),
  };

  const scanResult = await options.service.scanEventsMissingTtl(scanParameters);
  const updatedCount = await applyTtlToKeys(options.service, scanResult.keys, parsedEvent.ttl);

  addMetric(MetricNames.TTL_BACKFILL_ROWS_UPDATED, undefined, updatedCount);
  metric.publishStoredMetrics();

  const report: BackfillReport = {
    scannedCount: scanResult.scannedCount,
    matchedCount: scanResult.keys.length,
    updatedCount,
    complete: scanResult.lastEvaluatedKey === undefined,
    ...(scanResult.lastEvaluatedKey && { lastEvaluatedKey: scanResult.lastEvaluatedKey }),
  };

  logger.info('TTL backfill page complete.', { ...report });
  return report;
}

/**
 * Parse the invocation event, recording a metric and throwing on failure so a bad manual payload
 * surfaces loudly rather than silently scanning the wrong window.
 */
function parseBackfillEvent(event: unknown): BackfillEvent {
  const result = backfillEventSchema.safeParse(event);
  if (!result.success) {
    const message = `Invalid TTL backfill event. ${prettifyError(result.error)}`;
    logger.error(message);
    addMetric(MetricNames.TTL_BACKFILL_INVALID_EVENT);
    metric.publishStoredMetrics();
    throw new Error(message);
  }
  return result.data;
}

/**
 * Apply the TTL to every key in bounded-concurrency batches, returning how many rows were actually
 * updated (rows that already had a TTL are skipped by the conditional write and not counted).
 */
async function applyTtlToKeys(
  service: TtlBackfillService,
  keys: InterventionEventKey[],
  ttlSeconds: number,
): Promise<number> {
  let updatedCount = 0;
  for (let index = 0; index < keys.length; index += UPDATE_CONCURRENCY) {
    const batch = keys.slice(index, index + UPDATE_CONCURRENCY);
    const results = await Promise.all(batch.map((key) => service.applyTtl(key, ttlSeconds)));
    updatedCount += results.filter(Boolean).length;
  }
  logger.debug(`${LOGS_PREFIX_SENSITIVE_INFO} Applied backfill TTL to ${updatedCount.toString()} rows.`);
  return updatedCount;
}
