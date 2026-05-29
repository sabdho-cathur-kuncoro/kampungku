import { z } from 'zod';

const nikRegex = /^\d{16}$/;
const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)/;
const statusTinggalEnum = z.enum(['TETAP', 'KONTRAK', 'KOST', 'PINDAH']);

export const listWargaQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: statusTinggalEnum.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const wargaIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid('Warga id harus UUID') }),
});

export const createWargaSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
    email: z.string().email('Format email tidak valid'),
    phone: z.string().max(15).optional(),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(passwordRegex, 'Password harus mengandung huruf dan angka'),
    nik: z.string().regex(nikRegex, 'NIK harus 16 digit angka'),
    noKk: z.string().regex(nikRegex, 'No. KK harus 16 digit angka'),
    alamat: z.string().min(5, 'Alamat minimal 5 karakter').max(500),
    statusTinggal: statusTinggalEnum.optional(),
    tglMasuk: z.string().date('Format tanggal tidak valid (YYYY-MM-DD)').optional(),
  }),
});

export type CreateWargaInput = z.infer<typeof createWargaSchema>['body'];

export const updateWargaSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      name: z.string().min(2).max(100).optional(),
      phone: z.string().max(15).optional(),
      nik: z.string().regex(nikRegex).optional(),
      noKk: z.string().regex(nikRegex).optional(),
      alamat: z.string().min(5).max(500).optional(),
      statusTinggal: statusTinggalEnum.optional(),
      tglMasuk: z.string().date().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'Minimal satu field harus diisi' }),
});

export type UpdateWargaInput = z.infer<typeof updateWargaSchema>['body'];

export const createKeluargaSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    nama: z.string().min(2).max(100),
    nik: z.string().regex(nikRegex, 'NIK harus 16 digit angka'),
    hubungan: z.string().min(2).max(30),
    tglLahir: z.string().date('Format tanggal tidak valid (YYYY-MM-DD)'),
    jenisKelamin: z.enum(['L', 'P']),
    pekerjaan: z.string().max(100).optional(),
    pendidikan: z.string().max(50).optional(),
  }),
});

export type CreateKeluargaInput = z.infer<typeof createKeluargaSchema>['body'];

export const updateKeluargaSchema = z.object({
  params: z.object({ id: z.string().uuid(), kid: z.string().uuid() }),
  body: z
    .object({
      nama: z.string().min(2).max(100).optional(),
      nik: z.string().regex(nikRegex).optional(),
      hubungan: z.string().min(2).max(30).optional(),
      tglLahir: z.string().date().optional(),
      jenisKelamin: z.enum(['L', 'P']).optional(),
      pekerjaan: z.string().max(100).optional(),
      pendidikan: z.string().max(50).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'Minimal satu field harus diisi' }),
});

export type UpdateKeluargaInput = z.infer<typeof updateKeluargaSchema>['body'];

export const keluargaIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid(), kid: z.string().uuid() }),
});
