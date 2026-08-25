import { z } from 'zod';

const redirectContextSchema = z.object({
  redirect: z.literal('true'),
  redirectUrl: z.string(),
  authCookie: z.string(),
});

export type RedirectContext = undefined | null | Record<string, unknown>;

export type RedirectResult =
  | {
      success: true;
      redirectUrl: string;
      authCookie: string;
    }
  | {
      success: false;
    };

export interface RedirectHandler {
  parseRedirectContext(context: RedirectContext): RedirectResult;
}

export class RedirectChecker implements RedirectHandler {
  parseRedirectContext(context: RedirectContext): RedirectResult {
    const result = redirectContextSchema.safeParse(context);

    if (!result.success) {
      return { success: false };
    }

    return {
      success: true,
      redirectUrl: result.data.redirectUrl,
      authCookie: result.data.authCookie,
    };
  }
}
