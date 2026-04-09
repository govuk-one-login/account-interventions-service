import logger from '../logger';
import { compileSchema } from '../compile-schema';
import { metric } from '../metrics';

vi.mock('@aws-lambda-powertools/logger');
vi.mock('@aws-lambda-powertools/metrics');

describe('compile schema', () => {
  it('should throw if schema is not valid', () => {
    const schema = {
      definitions: {},
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: 'https://example.com/object1689242393.json',
      title: 'schema',
      description: 'This is an example of invalid schema',
      type: 'object',
      properties: {
        userId: {
          $id: '#root/userId',
          title: 'UserId',
          type: 'string',
          examples: 'urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9NCEp5d4',
          pattern: '^[^,\\s]+$',
          minLength: 3,
        },
      },
    };
    expect(() => compileSchema(schema)).toThrow('Schema is invalid');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(metric.addMetric).toHaveBeenCalledWith('INVALID_SCHEMA', 'Count', 1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledWith('Schema is invalid, failed to compile', {
      reasons: expect.any(Array) as unknown,
      error: expect.anything() as unknown,
    });
  });
});
