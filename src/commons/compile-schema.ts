import logger from './logger';
import Ajv2019 from 'ajv/dist/2019';
import Ajv from 'ajv';
import { addMetric } from './metrics';
import { MetricNames } from '../data-types/constants';
import {
  TICF_ACCOUNT_INTERVENTIONSchema,
  AUTH_PASSWORD_RESET_SUCCESSFULSchema,
  AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENTSchema,
  IPV_ACCOUNT_INTERVENTION_ENDSchema,
} from '@govuk-one-login/event-catalogue-schemas';

const ajv = new Ajv({ allErrors: true });
const ajv2019 = new Ajv2019({ allErrors: true });

ajv2019.addSchema(TICF_ACCOUNT_INTERVENTIONSchema);
ajv2019.addSchema(AUTH_PASSWORD_RESET_SUCCESSFULSchema);
ajv2019.addSchema(AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENTSchema);
ajv2019.addSchema(IPV_ACCOUNT_INTERVENTION_ENDSchema);

/**
 * Helper function to verify if the schema is valid
 * @param schema - Schema obtained from schemas.ts
 * @returns Boolean or throws and logs errors
 */
export function compileSchema(schema: object, version2019 = false) {
  const ajvVersion = version2019 ? ajv2019 : ajv;

  try {
    return ajvVersion.compile(schema);
  } catch (error) {
    logger.error('Schema is invalid, failed to compile', { reasons: ajvVersion.errors, error });
    addMetric(MetricNames.INVALID_SCHEMA);
    throw new Error('Schema is invalid', { cause: error });
  }
}

/**
 * Helper function to verify if the schema is valid
 * @param schema - Schema obtained from schemas.ts
 * @returns Boolean or throws and logs errors
 */
export const compileSchema2019 = (schema: object) => compileSchema(schema, true);
