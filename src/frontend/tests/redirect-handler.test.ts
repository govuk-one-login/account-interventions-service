import { RedirectChecker } from '../redirect-handler';
  
  describe('RedirectChecker', () => {
    const checker = new RedirectChecker();
  
    describe('parseRedirectContext', () => {
      it('returns success with redirectUrl and authCookie when context is a valid redirect', () => {
        const result = checker.parseRedirectContext({
          redirect: 'true',
          redirectUrl: 'https://example.com/redirect',
          authCookie: 'session=abc; Path=/; HttpOnly',
        });
  
        expect(result).toEqual({
          success: true,
          redirectUrl: 'https://example.com/redirect',
          authCookie: 'session=abc; Path=/; HttpOnly',
        });
      });
  
      it('returns success: false when redirect is not "true"', () => {
        const result = checker.parseRedirectContext({
          redirect: 'false',
          redirectUrl: 'https://example.com',
          authCookie: 'session=abc',
        });
  
        expect(result).toEqual({ success: false });
      });
  
      it('returns success: false when context is undefined', () => {
        const result = checker.parseRedirectContext(undefined);
  
        expect(result).toEqual({ success: false });
      });

      it('returns success: false when context is null', () => {
        // eslint-disable-next-line unicorn/no-null
        const result = checker.parseRedirectContext(null);
  
        expect(result).toEqual({ success: false });
      });
  
      it('returns success: false when redirectUrl is missing', () => {
        const result = checker.parseRedirectContext({
          redirect: 'true',
          authCookie: 'session=abc',
        });
  
        expect(result).toEqual({ success: false });
      });
  
      it('returns success: false when authCookie is missing', () => {
        const result = checker.parseRedirectContext({
          redirect: 'true',
          redirectUrl: 'https://example.com',
        });
  
        expect(result).toEqual({ success: false });
      });
  
      it('returns success: false when redirectUrl is not a string', () => {
        const result = checker.parseRedirectContext({
          redirect: 'true',
          redirectUrl: { bad: 'object' },
          authCookie: 'session=abc',
        });
  
        expect(result).toEqual({ success: false });
      });
  
      it('returns success: false when authCookie is not a string', () => {
        const result = checker.parseRedirectContext({
          redirect: 'true',
          redirectUrl: 'https://example.com',
          authCookie: ['not', 'a', 'string'],
        });
  
        expect(result).toEqual({ success: false });
      });
  
      it('returns success: false when context is an empty object', () => {
        const result = checker.parseRedirectContext({});
  
        expect(result).toEqual({ success: false });
      });
    });
  });
