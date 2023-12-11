import logger from '../logger';
import { compileSchema } from '../compile-schema';
import { metric } from '../metrics';

jest.mock('@aws-lambda-powertools/logger');
jest.mock('@aws-lambda-powertools/metrics');

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
    expect(() => compileSchema(schema)).toThrowError('Schema is invalid');
    expect(metric.addMetric).toHaveBeenCalledWith('INVALID_SCHEMA', 'Count', 1);
    expect(logger.error).toHaveBeenCalledWith('Schema is invalid, failed to compile', {
      reasons: expect.any(Array),
      error: expect.anything(),
    });
  });
});
