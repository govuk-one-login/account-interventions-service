import notEmpty from './not-empty';

describe('notEmpty', () => {
  it('not empty', () => {
    expect(notEmpty('a')).toBe(true);
  });

  it('undefined', () => {
    expect(notEmpty(undefined)).toBe(false);
  });

  it('null', () => {
    // eslint-disable-next-line unicorn/no-null
    expect(notEmpty(null)).toBe(false);
  });
});
