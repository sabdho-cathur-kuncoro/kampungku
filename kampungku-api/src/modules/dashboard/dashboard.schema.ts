import { z } from 'zod';

export const keuanganQuerySchema = z.object({
  query: z.object({
    tahun: z.coerce.number().int().min(2000).max(2100).optional(),
  }),
});
