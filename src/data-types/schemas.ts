export const TxMAIngress = {
  definitions: {},
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://example.com/object1689242392.json',
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
      properties: {
        timestamp: {
          $id: '#root/event/timestamp',
          title: 'Timestamp',
          type: 'timestamp',
        },
        event_timestamp_ms: {
          $id: '#root/event/event_timestamp_ms',
          title: 'Event_timestamp_ms',
          type: 'timestamp',
        },
        event_name: {
          $id: '#root/event/event_name',
          title: 'Event_Name',
          type: 'string',
        },
        component_id: {
          $id: '#root/event/component_id',
          title: 'Component_id',
          type: 'string',
        },
        extension: {
          $id: '#root/event/extension',
          title: 'Extension',
          type: 'object',
          required: ['intervention'],
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
          },
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
        },
      },
    },
  },
};
