import { z } from 'zod';

export const listJenisIuranQuerySchema = z.object({
  query: z.object({
    aktif: z
      .string()
      .transform((v) => v === 'true')
      .optional(),
  }),
});

export const jenisIuranIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid('JenisIuran id harus UUID') }),
});

export const createJenisIuranSchema = z.object({
  body: z.object({
    nama: z.string().min(3, 'Nama minimal 3 karakter').max(100),
    jumlah: z.number().positive('Jumlah harus lebih dari 0'),
    keterangan: z.string().max(500).optional(),
  }),
});

export type CreateJenisIuranInput = z.infer<typeof createJenisIuranSchema>['body'];

export const updateJenisIuranSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      nama: z.string().min(3).max(100).optional(),
      jumlah: z.number().positive().optional(),
      keterangan: z.string().max(500).optional(),
      isAktif: z.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'Minimal satu field harus diisi' }),
});

export type UpdateJenisIuranInput = z.infer<typeof updateJenisIuranSchema>['body'];
