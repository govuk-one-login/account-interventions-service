import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import {
  deleteInterventionEventRecord,
  getInterventionEventsRecordsFromTable,
  putInterventionEventRecord,
} from '../../../utils/dynamo-database-methods';
import { invokeTtlBackfill } from '../../../utils/invoke-ttl-backfill';
import { BackfillReport } from '../../../../src/handlers/ttl-backfill';

const feature = await loadFeature('./tests/resources/features/TtlBackfill.feature');

/**
 * The scan is a full-table filtered Scan against a SHARED staging table, so seeding must not
 * collide with, or depend on, any real row. Every seeded row uses a fixed createdAt band far in the
 * past (year 2001, in ms) that real intervention events never occupy, and every invocation window
 * is tightly bracketed to only the seeded rows so no other row is matched.
 */
const SEED_CREATED_AT_BASE = 1_000_000_000_000;

/**
 * An arbitrary far-future epoch-seconds TTL. It sits comfortably beyond the lambda's one-year
 * minimum-runway validation, so it is always a valid event ttl regardless of the wall clock, and
 * being a fixed value lets us assert the row received exactly this value.
 */
const ARBITRARY_FUTURE_TTL = 9_999_999_999;

/** How much a seeded row's ttl is offset when we pre-seed an existing TTL, so it is distinguishable. */
const EXISTING_TTL_OFFSET = 1000;

/** How far outside the window the "ignored" row is seeded, well beyond the bracketed window. */
const OUTSIDE_WINDOW_OFFSET = 100_000;

/** A minimal shape for reading a seeded row back; only the attributes the assertions inspect. */
interface SeededRowReadBack {
  accountId: string;
  createdAt: number;
  ttl?: number;
  ttlSource?: string;
}

/**
 * Find the seeded row with the given createdAt among the rows returned for an account. Returns
 * undefined when absent (e.g. an out-of-window row a scenario expects not to have been changed but
 * that is still present) — callers narrow the specific attributes they assert on.
 */
function findSeededRow(
  rows: Record<string, unknown>[] | undefined,
  createdAt: number,
): SeededRowReadBack | undefined {
  const match = rows?.find((row) => row['createdAt'] === createdAt);
  if (!match) {
    return undefined;
  }
  return {
    accountId: String(match['accountId']),
    createdAt: Number(match['createdAt']),
    ttl: match['ttl'] === undefined ? undefined : Number(match['ttl']),
    ttlSource: match['ttlSource'] === undefined ? undefined : String(match['ttlSource']),
  };
}

/** A backfill invocation window (createdAt in ms) plus the absolute epoch-seconds ttl to write. */
interface BackfillWindow {
  windowStartMs: number;
  windowEndMs: number;
  ttl: number;
}

/**
 * The scan page size each invocation requests. It must stay at or below the lambda's MAX_SCAN_LIMIT,
 * which the event schema enforces. It is hard-coded rather than imported because the feature tests
 * are deployed without the application source, so importing a runtime value from `src/` fails to
 * resolve at run time — only types may be imported from there.
 */
const SCAN_PAGE_LIMIT = 1000;

/**
 * The most rows these tests will scan before giving up. The lambda scans one page per invocation
 * and the whole table must be traversed to reach the seeded rows, so the scenarios resume until the
 * report is complete. If the table has grown past this many rows the test cannot complete in a
 * sensible time, and the fix is to prune the non-production table rather than raise this bound. Dev
 * is already near 50,000 rows, so this is set higher to leave headroom while that is cleaned up.
 */
const MAX_ROWS_TO_SCAN = 100_000;
const MAX_BACKFILL_PAGES = Math.ceil(MAX_ROWS_TO_SCAN / SCAN_PAGE_LIMIT);

/**
 * Drive the backfill lambda over a window to completion and return the total rows updated across
 * all pages. Pages are issued sequentially because each resumes from the previous page's
 * lastEvaluatedKey, so they cannot be parallelised.
 * @param window - the createdAt window and the absolute epoch-seconds ttl to write
 * @returns the number of rows updated across the whole window
 */
async function runBackfillToCompletion(window: BackfillWindow): Promise<number> {
  let exclusiveStartKey: BackfillReport['lastEvaluatedKey'];
  let totalUpdatedCount = 0;
  for (let page = 0; page < MAX_BACKFILL_PAGES; page += 1) {
    const report = await invokeTtlBackfill({
      windowStartMs: window.windowStartMs,
      windowEndMs: window.windowEndMs,
      ttl: window.ttl,
      limit: SCAN_PAGE_LIMIT,
      ...(exclusiveStartKey && { exclusiveStartKey }),
    });
    totalUpdatedCount += report.updatedCount;
    if (report.complete) {
      return totalUpdatedCount;
    }
    exclusiveStartKey = report.lastEvaluatedKey;
  }
  throw new Error(
    `TTL backfill did not complete after scanning ${MAX_ROWS_TO_SCAN.toString()} rows ` +
      `(${MAX_BACKFILL_PAGES.toString()} pages of ${SCAN_PAGE_LIMIT.toString()}). The ` +
      `intervention-events table is too large for this feature test to scan to completion — ` +
      `clean up old rows in the non-production table to reduce its size, then re-run.`,
  );
}

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  let testAccountId: string;
  // Every createdAt we seed for the current scenario, so cleanup deletes exactly what it wrote.
  let seededCreatedAtValues: number[];

  BeforeEachScenario(() => {
    testAccountId = generateRandomTestUserId();
    seededCreatedAtValues = [];
  });

  AfterEachScenario(async () => {
    // Goal: leave the shared table exactly as we found it by deleting only the rows we seeded,
    // keyed on accountId + createdAt, so no scenario leaks rows into other runs.
    for (const createdAt of seededCreatedAtValues) {
      await deleteInterventionEventRecord(testAccountId, createdAt);
    }
  });

  Scenario('Backfills intervention-events rows that are missing a TTL', ({ Given, When, Then, And }) => {
    const firstCreatedAt = SEED_CREATED_AT_BASE;
    const secondCreatedAt = SEED_CREATED_AT_BASE + 1;
    let updatedCount = 0;

    Given('two intervention-events rows exist in the seeded window with no TTL', async () => {
      // Goal: create the deterministic input for the happy path by seeding two rows in the band,
      // both with no ttl, so the scan's attribute_not_exists(ttl) filter matches them.
      seededCreatedAtValues.push(firstCreatedAt, secondCreatedAt);
      await putInterventionEventRecord({ accountId: testAccountId, createdAt: firstCreatedAt });
      await putInterventionEventRecord({ accountId: testAccountId, createdAt: secondCreatedAt });
      await timeDelayForTestEnvironment(2000);
    });

    When('I invoke the TTL backfill lambda over a window bracketing those rows', async () => {
      // Goal: drive the lambda across the whole table to completion (it processes one scan page per
      // invocation) over a window that tightly brackets only the two seeded rows, accumulating the
      // rows updated so the Then can assert both seeded rows were written.
      updatedCount = await runBackfillToCompletion({
        windowStartMs: SEED_CREATED_AT_BASE - 1,
        windowEndMs: SEED_CREATED_AT_BASE + 10,
        ttl: ARBITRARY_FUTURE_TTL,
      });
    });

    Then('the report is complete and reports at least two rows updated', () => {
      // Goal: confirm the run reached and updated our rows; completeness is guaranteed because
      // runBackfillToCompletion only returns once the report is complete (otherwise it throws).
      expect(updatedCount).toBeGreaterThanOrEqual(2);
    });

    And('each of those rows now has the backfilled TTL tagged as BACKFILL', async () => {
      // Goal: confirm the write landed by reading both rows back and asserting the exact TTL and
      // its BACKFILL tag, allowing for eventual consistency with a short delay before reading.
      await timeDelayForTestEnvironment(2000);
      const rows = await getInterventionEventsRecordsFromTable(testAccountId);

      const firstRow = findSeededRow(rows, firstCreatedAt);
      const secondRow = findSeededRow(rows, secondCreatedAt);

      expect(firstRow?.ttl).toBe(ARBITRARY_FUTURE_TTL);
      expect(firstRow?.ttlSource).toBe('BACKFILL');
      expect(secondRow?.ttl).toBe(ARBITRARY_FUTURE_TTL);
      expect(secondRow?.ttlSource).toBe('BACKFILL');
    });
  });

  Scenario('Leaves rows that already have a TTL untouched', ({ Given, When, Then }) => {
    const existingTtlCreatedAt = SEED_CREATED_AT_BASE;
    const preExistingTtl = ARBITRARY_FUTURE_TTL + EXISTING_TTL_OFFSET;

    Given('an intervention-events row exists in the seeded window with an existing TTL', async () => {
      // Goal: seed a row that already has a ttl (and no ttlSource) so the scan's
      // attribute_not_exists(ttl) filter excludes it and the backfill must leave it alone.
      seededCreatedAtValues.push(existingTtlCreatedAt);
      await putInterventionEventRecord({
        accountId: testAccountId,
        createdAt: existingTtlCreatedAt,
        ttl: preExistingTtl,
      });
      await timeDelayForTestEnvironment(2000);
    });

    When('I invoke the TTL backfill lambda over a window covering that row', async () => {
      // Goal: drive the lambda to completion over a window that covers the row, so the whole table
      // is scanned and the only reason the row stays untouched is the missing-ttl filter (it
      // already has a ttl) — not that the scan never reached it.
      await runBackfillToCompletion({
        windowStartMs: SEED_CREATED_AT_BASE - 1,
        windowEndMs: SEED_CREATED_AT_BASE + 10,
        ttl: ARBITRARY_FUTURE_TTL,
      });
    });

    Then("that row's TTL is unchanged and it is not tagged as BACKFILL", async () => {
      // Goal: confirm non-interference by reading the row back and asserting its ttl is still the
      // original value and that it was never tagged as a backfilled row.
      await timeDelayForTestEnvironment(2000);
      const rows = await getInterventionEventsRecordsFromTable(testAccountId);
      const row = findSeededRow(rows, existingTtlCreatedAt);

      expect(row?.ttl).toBe(preExistingTtl);
      expect(row?.ttlSource).not.toBe('BACKFILL');
    });
  });

  Scenario('Ignores rows outside the createdAt window', ({ Given, When, Then }) => {
    const outsideWindowCreatedAt = SEED_CREATED_AT_BASE + OUTSIDE_WINDOW_OFFSET;

    Given('an intervention-events row exists with no TTL outside the invocation window', async () => {
      // Goal: seed a row with no ttl but at a createdAt beyond the window used below, so the scan's
      // window filter is the reason it is skipped.
      seededCreatedAtValues.push(outsideWindowCreatedAt);
      await putInterventionEventRecord({ accountId: testAccountId, createdAt: outsideWindowCreatedAt });
      await timeDelayForTestEnvironment(2000);
    });

    When('I invoke the TTL backfill lambda over a window that excludes that row', async () => {
      // Goal: drive the lambda to completion over the tight band window that does NOT include the
      // out-of-window row, so the whole table is scanned and the row is left alone because the
      // window filter excludes it — not because the scan never reached it.
      await runBackfillToCompletion({
        windowStartMs: SEED_CREATED_AT_BASE - 1,
        windowEndMs: SEED_CREATED_AT_BASE + 10,
        ttl: ARBITRARY_FUTURE_TTL,
      });
    });

    Then('that row still has no TTL', async () => {
      // Goal: confirm the out-of-window row was untouched by reading it back and asserting it still
      // has no ttl at all.
      await timeDelayForTestEnvironment(2000);
      const rows = await getInterventionEventsRecordsFromTable(testAccountId);
      const row = findSeededRow(rows, outsideWindowCreatedAt);

      expect(row?.ttl).toBeUndefined();
    });
  });
});
