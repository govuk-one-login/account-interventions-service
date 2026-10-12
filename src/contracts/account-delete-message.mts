import { z } from 'zod';

export const accountDeleteMessageSchema = z.object({
  event_name: z.literal('AUTH_DELETE_ACCOUNT'),
  user: z.object({
    user_id: z.string().trim().min(1, {
      message: 'String cannot be empty or just spaces',
    }),
  }),
});

export type AccountDeleteMessage = z.infer<typeof accountDeleteMessageSchema>;
