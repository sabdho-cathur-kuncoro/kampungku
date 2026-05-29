import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const adminBootstrapSchema = z.object({
  name: z.string().min(2, 'Nama admin minimal 2 karakter').max(100),
  email: z.string().email('Format email admin tidak valid'),
  phone: z.string().max(15).optional(),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'Password harus mengandung huruf dan angka'),
});

export const createTenantSchema = z.object({
  body: z.object({
    nama: z.string().min(3).max(150),
    slug: z
      .string()
      .min(3)
      .max(80)
      .regex(slugRegex, 'Slug hanya huruf kecil, angka, dan tanda hubung'),
    nomorRt: z.string().min(1).max(5),
    nomorRw: z.string().min(1).max(5),
    kelurahan: z.string().min(2).max(100),
    kecamatan: z.string().min(2).max(100),
    admin: adminBootstrapSchema,
  }),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>['body'];

export const updateTenantSchema = z.object({
  params: z.object({ id: z.string().uuid('Tenant id harus UUID') }),
  body: z
    .object({
      nama: z.string().min(3).max(150).optional(),
      slug: z.string().min(3).max(80).regex(slugRegex).optional(),
      nomorRt: z.string().min(1).max(5).optional(),
      nomorRw: z.string().min(1).max(5).optional(),
      kelurahan: z.string().min(2).max(100).optional(),
      kecamatan: z.string().min(2).max(100).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Minimal satu field harus diisi',
    }),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>['body'];

export const tenantIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid('Tenant id harus UUID') }),
});

export const listUsersQuerySchema = z.object({
  query: z.object({
    tenantId: z.string().uuid().optional(),
  }),
});
