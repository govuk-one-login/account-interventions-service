import { TriggerEventsEnum } from './constants';

export const TxMAIngress = {
  definitions: {},
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://github.com/govuk-one-login/account-interventions-service/tree/main/data-types/schemas.ts',
  title: 'Fraud Risk Engine Intervention Event',
  description: 'This schema validates the event that is received from TxMA Ingress',
  type: 'object',
  required: ['event'],
  properties: {
    event: {
      $id: '#root/event',
      title: 'Event',
      type: 'object',
      required: ['timestamp', 'event_name', 'user'],
      allOf: [
        {
          if: { properties: { event_name: { enum: [TriggerEventsEnum.IPV_IDENTITY_ISSUED] } } },
          // eslint-disable-next-line unicorn/no-thenable
          then: {
            required: ['extensions'],
            properties: {
              extensions: {
                type: 'object',
                required: ['levelOfConfidence', 'ciFail', 'hasMitigations'],
                not: {
                  anyOf: [{ required: ['intervention'] }],
                },
              },
            },
          },
        },
        {
          if: { properties: { event_name: { enum: [TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION] } } },
          // eslint-disable-next-line unicorn/no-thenable
          then: {
            required: ['extensions'],
            properties: {
              extensions: {
                type: 'object',
                required: ['intervention'],
                not: {
                  anyOf: [
                    { required: ['levelOfConfidence'] },
                    { required: ['ciFail'] },
                    { required: ['hasMitigations'] },
                  ],
                },
                properties: {
                  intervention: {
                    type: 'object',
                    required: ['intervention_code', 'intervention_reason'],
                  },
                },
              },
            },
          },
        },
      ],
      properties: {
        timestamp: {
          $id: '#root/event/timestamp',
          title: 'Timestamp',
          type: 'number',
        },
        event_timestamp_ms: {
          $id: '#root/event/event_timestamp_ms',
          title: 'Event_timestamp_ms',
          type: 'number',
        },
        event_name: {
          $id: '#root/event/event_name',
          title: 'Event_Name',
          enum: Object.values(TriggerEventsEnum),
        },
        component_id: {
          $id: '#root/event/component_id',
          title: 'Component_id',
          type: 'string',
        },
        extensions: {
          $id: '#root/event/extensions',
          title: 'Extensions',
          type: 'object',
          properties: {
            intervention: {
              $id: '#root/event/intervention',
              title: 'Intervention',
              type: 'object',
              required: ['intervention_code', 'intervention_reason'],
              properties: {
                intervention_code: {
                  $id: '#root/event/intervention_code',
                  title: 'Intervention_code',
                  type: 'string',
                },
                intervention_reason: {
                  $id: '#root/event/intervention_reason',
                  title: 'Intervention_reason',
                  type: 'string',
                },
                cms_id: {
                  $id: '#root/event/cms_id',
                  title: 'Cms_id',
                  type: 'string',
                },
                requester_id: {
                  $id: '#root/event/requester_id',
                  title: 'Requester_id',
                  type: 'string',
                },
                audit_level: {
                  $id: '#root/event/audit_level',
                  title: 'Audit_level',
                  type: 'string',
                },
              },
            },
            levelOfConfidence: {
              $id: '#root/event/levelOfConfidence',
              title: 'LevelOfConfidence',
              type: 'string',
            },
            ciFail: {
              $id: '#root/event/ciFail',
              title: 'CIFail',
              type: 'boolean',
            },
            hasMitigations: {
              $id: '#root/event/hasMitigations',
              title: 'HasMitigations',
              type: 'boolean',
            },
          },
          oneOf: [
            {
              required: ['intervention'],
              not: {
                anyOf: [
                  { required: ['levelOfConfidence'] },
                  { required: ['ciFail'] },
                  { required: ['hasMitigations'] },
                ],
              },
            },
            {
              required: ['levelOfConfidence'],
              not: {
                anyOf: [{ required: ['intervention'] }],
              },
            },
          ],
        },
        user: {
          $id: '#root/event/user',
          title: 'User',
          type: 'object',
          required: ['user_id'],
          properties: {
            user_id: {
              $id: '#root/event/user_id',
              title: 'User_Id',
              type: 'string',
              pattern: '^[^,\\s]+$',
              minLength: 3,
            },
          },
          additionalProperties: true,
        },
      },
    },
  },
};
