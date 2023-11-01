export const TxMAIngress = {
  definitions: {},
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://example.com/object1689242392.json',
  title: 'Encrypt Event Validator schema',
  description: 'This schema validates the event that triggers Encrypt Data',
  type: 'object',
  required: ['event'],
  properties: {
    event: {
      $id: '#root/event',
      title: 'Event',
      type: 'object',
      required: ['userId', 'jwt'],
      properties: {
        userId: {
          $id: '#root/event/userId',
          title: 'UserId',
          type: 'string',
          examples: ['urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9NCEp5d4'],
          pattern: '^[^,\\s]+$',
          minLength: 3,
        },
        jwt: {
          $id: '#root/event/jwt',
          title: 'JWT',
          type: 'string',
          pattern: '(^[A-Za-z0-9-_]*\\.[A-Za-z0-9-_]*\\.[A-Za-z0-9-_]*$)',
        },
      },
    },
  },
};
