import { Codes, isCode } from './constants';

describe('isCode', () => {
  it('Valid code', () => {
    expect(isCode(Codes.C01)).toBe(true);
  });

  it('Valid code string', () => {
    expect(isCode(Codes.C01.toString())).toBe(true);
  });

  it('Invalid code', () => {
    expect(isCode('C123')).toBe(false);
  });
});
