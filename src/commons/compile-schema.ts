import logger from './logger';
import Ajv2019 from 'ajv/dist/2019';
import { addMetric } from './metrics';
import { MetricNames } from '../data-types/constants';
import {
  TICF_ACCOUNT_INTERVENTIONSchema,
  AUTH_PASSWORD_RESET_SUCCESSFULSchema,
  AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENTSchema,
  IPV_ACCOUNT_INTERVENTION_ENDSchema,
} from '@govuk-one-login/event-catalogue-schemas';

interface Schema {
  properties: Record<string, unknown>;
  required: string[];
}

export const addEventMetadataToSchema = (schema: Schema, eventName: string) => ({
  ...schema,
  required: [...schema.required, 'event_id'],
  properties: {
    ...schema.properties,
    event_name: {
      type: 'string',
      const: eventName,
    },
    event_id: {
      type: 'string',
    },
    txma: {
      type: 'object',
    },
  },
});

const ajv2019 = (() => {
  const ajv = new Ajv2019({ allErrors: true });
  ajv.addSchema(addEventMetadataToSchema(TICF_ACCOUNT_INTERVENTIONSchema, 'TICF_ACCOUNT_INTERVENTION'));
  ajv.addSchema(addEventMetadataToSchema(AUTH_PASSWORD_RESET_SUCCESSFULSchema, 'AUTH_PASSWORD_RESET_SUCCESSFUL'));
  ajv.addSchema(
    addEventMetadataToSchema(
      AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENTSchema,
      'AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT',
    ),
  );
  ajv.addSchema(addEventMetadataToSchema(IPV_ACCOUNT_INTERVENTION_ENDSchema, 'IPV_ACCOUNT_INTERVENTION_END'));
  return ajv;
})();

/**
 * Helper function to verify if the schema is valid
 * @param schema - Schema obtained from schemas.ts
 * @returns Boolean or throws and logs errors
 */
export function compileSchema(schema: object) {
  try {
    return ajv2019.compile(schema);
  } catch (error) {
    logger.error('Schema is invalid, failed to compile', { reasons: ajv2019.errors, error });
    addMetric(MetricNames.INVALID_SCHEMA);
    throw new Error('Schema is invalid', { cause: error });
  }
}
