/* v8 ignore start -- production-only Lambda wiring; the behaviour lives in ./ttl-backfill and is unit tested there, while this wiring is covered by post-merge feature tests per ADR 007 */

import { Context } from 'aws-lambda';
import logger from '../commons/logger';
import { AppConfigService } from '../services/app-config-service';
import { getDBDocumentClient } from '../services/database-client';
import { interventionEventsTableConfig } from '../tables/intervention-events';
import { DynamoDBTtlBackfillService } from '../services/ttl-backfill-service';
import { BackfillReport, processTtlBackfill } from './ttl-backfill';

const config = AppConfigService.getInstance().getConfigObject(['interventionEventsBackfillTtl']);
const service = new DynamoDBTtlBackfillService(interventionEventsTableConfig, getDBDocumentClient());

/**
 * Manually invoked handler that backfills a static TTL onto intervention-events rows that have none.
 * The event selects a `createdAt` window and an optional page size / resume key; the returned
 * report includes `lastEvaluatedKey` so the operator can re-invoke to continue from where it stopped.
 * @param event - the backfill instruction; validated inside processTtlBackfill
 * @param context - Lambda context
 * @returns a report of the page's progress
 */
export async function handler(event: unknown, context: Context): Promise<BackfillReport> {
  logger.addContext(context);
  return processTtlBackfill(event, { service, ttlSeconds: config.interventionEventsBackfillTtl });
}

/* v8 ignore stop */
