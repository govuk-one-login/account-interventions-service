import {
  TICF_ACCOUNT_INTERVENTIONSchema,
  AUTH_PASSWORD_RESET_SUCCESSFULSchema,
  AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENTSchema,
  IPV_ACCOUNT_INTERVENTION_ENDSchema,
} from '@govuk-one-login/event-catalogue-schemas';

export const EventCatalogueCombinedSchema = {
  $schema: 'https://json-schema.org/draft/2019-09/schema',
  type: 'object',
  oneOf: [
    { $ref: TICF_ACCOUNT_INTERVENTIONSchema.$id },
    {
      $ref: AUTH_PASSWORD_RESET_SUCCESSFULSchema.$id,
    },
    {
      $ref: AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENTSchema.$id,
    },
    {
      $ref: IPV_ACCOUNT_INTERVENTION_ENDSchema.$id,
    },
  ],
};
