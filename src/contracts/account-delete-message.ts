import { z } from 'zod';

export const accountDeleteMessageSchema = z.object({
  event_name: z.literal('AUTH_DELETE_ACCOUNT'),
  user_id: z.string().optional(),
});

export type AccountDeleteMessage = z.infer<typeof accountDeleteMessageSchema>;
