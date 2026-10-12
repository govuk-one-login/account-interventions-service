import notEmpty from './not-empty.mts';

describe('notEmpty', () => {
  it('not empty', () => {
    expect(notEmpty('a')).toBe(true);
  });

  it('undefined', () => {
    expect(notEmpty(undefined)).toBe(false);
  });

  it('null', () => {
    expect(notEmpty(null)).toBe(false);
  });
});
