import jsonSafeParse from './json-safe-parse';

const validJson = '{"test": 1}';
const invalidJson = '}';

describe('jsonSafeParse', () => {
  it('parses valid json', () => {
    expect(jsonSafeParse(validJson)).toEqual({
      success: true,
      data: {
        test: 1,
      },
    });
  });

  it('reports failure for invalid json', () => {
    expect(jsonSafeParse(invalidJson)).toEqual({
      success: false,
      error: new SyntaxError('Unexpected token \'}\', "}" is not valid JSON'),
    });
  });
});
