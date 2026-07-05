import { z } from 'zod';

export const sendMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Pesan tidak boleh kosong').max(1000, 'Pesan maksimal 1000 karakter'),
  }),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>['body'];

export const historyQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().optional(),
  }),
});
