import {
  TICF_ACCOUNT_INTERVENTIONSchema,
  AUTH_PASSWORD_RESET_SUCCESSFULSchema,
  AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENTSchema,
  IPV_ACCOUNT_INTERVENTION_ENDSchema,
} from '@govuk-one-login/event-catalogue-schemas';

export const EventCatalogueCombinedSchema = {
  $schema: 'https://json-schema.org/draft/2019-09/schema',
  required: ['event_name'],
  type: 'object',
  allOf: [
    {
      if: { properties: { event_name: { const: 'TICF_ACCOUNT_INTERVENTION' } } },
      // eslint-disable-next-line unicorn/no-thenable
      then: { $ref: TICF_ACCOUNT_INTERVENTIONSchema.$id },
    },
    {
      if: { properties: { event_name: { const: 'AUTH_PASSWORD_RESET_SUCCESSFUL' } } },
      // eslint-disable-next-line unicorn/no-thenable
      then: { $ref: AUTH_PASSWORD_RESET_SUCCESSFULSchema.$id },
    },
    {
      if: { properties: { event_name: { const: 'AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT' } } },
      // eslint-disable-next-line unicorn/no-thenable
      then: { $ref: AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENTSchema.$id },
    },
    {
      if: { properties: { event_name: { const: 'IPV_ACCOUNT_INTERVENTION_END' } } },
      // eslint-disable-next-line unicorn/no-thenable
      then: { $ref: IPV_ACCOUNT_INTERVENTION_ENDSchema.$id },
    },
  ],
};
