import { normalisePathSegment } from '../utils/normalise-path-segment';

describe('normalisePathSegment', () => {
  it.each([
    // empty / whitespace
    ['', ''],
    [' '.repeat(3), ''],

    // no leading slash — one is prepended
    ['v1', '/v1'],
    ['interventions/v1', '/interventions/v1'],

    // leading slash already present — preserved as-is
    ['/v1', '/v1'],
    ['//v1', '//v1'],

    // trailing slash stripped (only the last character)
    ['/v1/', '/v1'],
    ['interventions/', '/interventions'],
    ['//v1//', '//v1/'],

    // whitespace trimmed before normalising
    ['  /v1  ', '/v1'],
    ['  interventions/  ', '/interventions'],
  ])('normalisePathSegment(%j) → %j', (input, expected) => {
    expect(normalisePathSegment(input)).toBe(expected);
  });
});
