import { z } from 'zod';

const jenisSuratEnum = z.enum([
  'DOMISILI',
  'KETERANGAN_TIDAK_MAMPU',
  'KETERANGAN_USAHA',
  'PENGANTAR_KTP',
  'PENGANTAR_KK',
  'LAINNYA',
]);

export const listSuratQuerySchema = z.object({
  query: z.object({
    status: z.enum(['DIAJUKAN', 'DIPROSES', 'DISETUJUI', 'DITOLAK']).optional(),
    jenisSurat: jenisSuratEnum.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const suratIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid('Surat id harus UUID') }),
});

export const ajukanSuratSchema = z.object({
  body: z.object({
    jenisSurat: jenisSuratEnum,
    keperluan: z.string().min(10, 'Keperluan minimal 10 karakter').max(500),
  }),
});

export type AjukanSuratInput = z.infer<typeof ajukanSuratSchema>['body'];

export const tolakSuratSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    alasanTolak: z.string().min(5, 'Alasan tolak minimal 5 karakter').max(500),
  }),
});

export type TolakSuratInput = z.infer<typeof tolakSuratSchema>['body'];
