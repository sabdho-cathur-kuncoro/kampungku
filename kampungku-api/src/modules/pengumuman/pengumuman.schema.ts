import { z } from 'zod';

const kategoriEnum = z.enum(['UMUM', 'KEGIATAN', 'KEUANGAN', 'DARURAT']);

export const listPengumumanQuerySchema = z.object({
  query: z.object({
    kategori: kategoriEnum.optional(),
    isPinned: z
      .string()
      .transform((v) => v === 'true')
      .optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const pengumumanIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid('Pengumuman id harus UUID') }),
});

export const createPengumumanSchema = z.object({
  body: z.object({
    judul: z.string().min(3, 'Judul minimal 3 karakter').max(200),
    konten: z.string().min(10, 'Konten minimal 10 karakter'),
    kategori: kategoriEnum.optional(),
    tglMulai: z.string().date('Format tanggal tidak valid (YYYY-MM-DD)'),
    tglSelesai: z.string().date('Format tanggal tidak valid (YYYY-MM-DD)').optional(),
    isPinned: z.boolean().optional(),
  }),
});

export type CreatePengumumanInput = z.infer<typeof createPengumumanSchema>['body'];

export const updatePengumumanSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      judul: z.string().min(3).max(200).optional(),
      konten: z.string().min(10).optional(),
      kategori: kategoriEnum.optional(),
      tglMulai: z.string().date().optional(),
      tglSelesai: z.string().date().optional(),
      isPinned: z.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'Minimal satu field harus diisi' }),
});

export type UpdatePengumumanInput = z.infer<typeof updatePengumumanSchema>['body'];
