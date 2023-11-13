import logger from './logger';
import Ajv from 'ajv';
import { logAndPublishMetric } from './metrics';
import { MetricNames } from '../data-types/constants';

const ajv = new Ajv({ allErrors: true });

/**
 * Helper function to verify if the schema is valid
 * @param schema - Schema obtained from schemas.ts
 * @returns Boolean or throws and logs errors
 */
export function compileSchema(schema: object) {
  try {
    return ajv.compile(schema);
  } catch (error) {
    logger.error('Schema is invalid, failed to compile', { reasons: ajv.errors, error });
    logAndPublishMetric(MetricNames.INVALID_SCHEMA);
    throw new Error('Schema is invalid');
  }
}
