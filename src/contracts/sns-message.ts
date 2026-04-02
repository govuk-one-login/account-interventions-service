import { z } from 'zod';

export const snsMessageSchema = z.object({
  Message: z.string(),
});

export type SnsMessage = z.infer<typeof snsMessageSchema>;
