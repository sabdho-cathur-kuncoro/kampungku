import { z } from 'zod';

// Roles an intra-tenant ADMIN is allowed to assign — SUPER_ADMIN is platform-only
const tenantRoleEnum = z.enum(['ADMIN', 'KETUA_RT', 'BENDAHARA', 'SEKRETARIS', 'WARGA']);

export const listUsersQuerySchema = z.object({
  query: z.object({
    role: tenantRoleEnum.optional(),
    isActive: z
      .string()
      .transform((v) => v === 'true')
      .optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid('User id harus UUID') }),
});

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
    email: z.string().email('Format email tidak valid'),
    phone: z.string().max(15).optional(),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    role: tenantRoleEnum,
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];

export const updateProfileSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      name: z.string().min(2).max(100).optional(),
      phone: z.string().max(15).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'Minimal satu field harus diisi' }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];

export const changeRoleSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ role: tenantRoleEnum }),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>['body'];

export const changePasswordSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    // Required when changing own password; omitted for ADMIN reset
    oldPassword: z.string().optional(),
    newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
  }),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
