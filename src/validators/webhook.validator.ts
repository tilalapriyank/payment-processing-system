import { z } from 'zod';

export const webhookPayloadSchema = z.object({
  eventId: z.string().min(1),
  paymentId: z.string().uuid(),
  status: z.enum(['SUCCESS', 'FAILED']),
});

export type WebhookPayloadInput = z.infer<typeof webhookPayloadSchema>;
