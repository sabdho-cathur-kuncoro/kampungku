import { z } from 'zod';

const statusIuranEnum = z.enum(['BELUM_BAYAR', 'MENUNGGU_VERIFIKASI', 'LUNAS']);

export const listIuranQuerySchema = z.object({
  query: z.object({
    bulan: z.coerce.number().int().min(1).max(12).optional(),
    tahun: z.coerce.number().int().min(2020).max(2100).optional(),
    status: statusIuranEnum.optional(),
  }),
});

export const iuranIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid('Iuran id harus UUID') }),
});

export const wargaParamSchema = z.object({
  params: z.object({ wargaId: z.string().uuid('Warga id harus UUID') }),
});

export const createTagihanSchema = z.object({
  body: z.object({
    wargaId: z.string().uuid('Warga id harus UUID'),
    jenisIuranId: z.string().uuid('Jenis iuran id harus UUID'),
    bulan: z.number().int().min(1).max(12),
    tahun: z.number().int().min(2020).max(2100),
    jumlah: z.number().positive().optional(),
    catatan: z.string().max(500).optional(),
  }),
});

export type CreateTagihanInput = z.infer<typeof createTagihanSchema>['body'];

export const bayarSchema = z.object({
  body: z.object({
    tagihanId: z.string().uuid('Tagihan id harus UUID'),
    catatan: z.string().max(500).optional(),
  }),
});

export type BayarInput = z.infer<typeof bayarSchema>['body'];

export const verifikasiSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    approve: z.boolean(),
    catatan: z.string().max(500).optional(),
  }),
});

export type VerifikasiInput = z.infer<typeof verifikasiSchema>['body'];

export const laporanQuerySchema = z.object({
  query: z.object({
    bulan: z.coerce.number().int().min(1).max(12).optional(),
    tahun: z.coerce.number().int().min(2020).max(2100).optional(),
  }),
});
