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

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  let testAccountId: string;
  // Every createdAt we seed for the current scenario, so cleanup deletes exactly what it wrote.
  let seededCreatedAtValues: number[];
  let report: BackfillReport;

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

    Given('two intervention-events rows exist in the seeded window with no TTL', async () => {
      // Goal: create the deterministic input for the happy path by seeding two rows in the band,
      // both with no ttl, so the scan's attribute_not_exists(ttl) filter matches them.
      seededCreatedAtValues.push(firstCreatedAt, secondCreatedAt);
      await putInterventionEventRecord({ accountId: testAccountId, createdAt: firstCreatedAt });
      await putInterventionEventRecord({ accountId: testAccountId, createdAt: secondCreatedAt });
      await timeDelayForTestEnvironment(2000);
    });

    When('I invoke the TTL backfill lambda over a window bracketing those rows', async () => {
      // Goal: run the lambda over a window that tightly brackets only the two seeded rows by
      // invoking it with windowStartMs/windowEndMs around SEED_CREATED_AT_BASE.
      report = await invokeTtlBackfill({
        windowStartMs: SEED_CREATED_AT_BASE - 1,
        windowEndMs: SEED_CREATED_AT_BASE + 10,
        ttl: ARBITRARY_FUTURE_TTL,
      });
    });

    Then('the report is complete and reports at least two rows updated', () => {
      // Goal: confirm the lambda finished the window and updated our rows by asserting the report.
      expect(report.complete).toBe(true);
      expect(report.updatedCount).toBeGreaterThanOrEqual(2);
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
      // Goal: run the lambda over a window that does cover the row, so the only reason it stays
      // untouched is the missing-ttl filter — not the window.
      report = await invokeTtlBackfill({
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
      // Goal: run the lambda over the tight band window that does NOT include the out-of-window
      // row, so it must not be evaluated for update.
      report = await invokeTtlBackfill({
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
