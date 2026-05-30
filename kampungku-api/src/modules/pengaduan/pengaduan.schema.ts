import { z } from 'zod';

const statusEnum = z.enum(['BARU', 'DIPROSES', 'SELESAI', 'DITOLAK']);

export const listPengaduanQuerySchema = z.object({
  query: z.object({
    status: statusEnum.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const pengaduanIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid('Pengaduan id harus UUID') }),
});

export const createPengaduanSchema = z.object({
  body: z.object({
    judul: z.string().min(5, 'Judul minimal 5 karakter').max(200),
    deskripsi: z.string().min(20, 'Deskripsi minimal 20 karakter'),
    isAnonim: z.boolean().optional(),
  }),
});

export type CreatePengaduanInput = z.infer<typeof createPengaduanSchema>['body'];

export const updateStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: statusEnum,
    tanggapan: z.string().min(5).max(1000).optional(),
  }),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>['body'];
