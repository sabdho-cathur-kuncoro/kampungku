import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { tenantActiveCacheKey } from '../../middlewares/tenant.middleware';
import { AppError } from '../../utils/errors';
import type { CreateTenantInput, UpdateTenantInput } from './tenant.schema';

const TENANT_SELECT = {
  id: true,
  nama: true,
  slug: true,
  nomorRt: true,
  nomorRw: true,
  kelurahan: true,
  kecamatan: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const isUniqueViolation = (err: unknown, target: string): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError &&
  err.code === 'P2002' &&
  Array.isArray(err.meta?.target) &&
  (err.meta!.target as string[]).includes(target);

export const tenantService = {
  async list() {
    return prisma.rT.findMany({
      orderBy: { createdAt: 'desc' },
      select: TENANT_SELECT,
    });
  },

  async getById(id: string) {
    const tenant = await prisma.rT.findUnique({
      where: { id },
      select: TENANT_SELECT,
    });
    if (!tenant) throw new AppError('Tenant tidak ditemukan', 404);
    return tenant;
  },

  /**
   * Create tenant + bootstrap ADMIN user in a single transaction.
   * Both rows commit together or neither does.
   */
  async create(input: CreateTenantInput) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.admin.email },
      select: { id: true },
    });
    if (existingEmail) {
      throw new AppError('Email admin sudah terdaftar', 409);
    }

    const passwordHash = await bcrypt.hash(input.admin.password, 12);

    try {
      const result = await prisma.$transaction(async (tx) => {
        const tenant = await tx.rT.create({
          data: {
            nama: input.nama,
            slug: input.slug,
            nomorRt: input.nomorRt,
            nomorRw: input.nomorRw,
            kelurahan: input.kelurahan,
            kecamatan: input.kecamatan,
            isActive: true,
          },
          select: TENANT_SELECT,
        });

        const admin = await tx.user.create({
          data: {
            tenantId: tenant.id,
            name: input.admin.name,
            email: input.admin.email,
            phone: input.admin.phone,
            passwordHash,
            role: 'ADMIN',
            isActive: true,
          },
          select: {
            id: true,
            tenantId: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        });

        return { tenant, admin };
      });

      return result;
    } catch (err) {
      if (isUniqueViolation(err, 'slug')) {
        throw new AppError('Slug tenant sudah digunakan', 409);
      }
      if (isUniqueViolation(err, 'email')) {
        throw new AppError('Email admin sudah terdaftar', 409);
      }
      throw err;
    }
  },

  async update(id: string, input: UpdateTenantInput) {
    const existing = await prisma.rT.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new AppError('Tenant tidak ditemukan', 404);

    try {
      return await prisma.rT.update({
        where: { id },
        data: input,
        select: TENANT_SELECT,
      });
    } catch (err) {
      if (isUniqueViolation(err, 'slug')) {
        throw new AppError('Slug tenant sudah digunakan', 409);
      }
      throw err;
    }
  },

  async setActive(id: string, isActive: boolean) {
    const existing = await prisma.rT.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new AppError('Tenant tidak ditemukan', 404);

    const updated = await prisma.rT.update({
      where: { id },
      data: { isActive },
      select: TENANT_SELECT,
    });

    // Invalidate the tenantScope active-flag cache so the change takes effect immediately.
    await redis.del(tenantActiveCacheKey(id));

    return updated;
  },

  async listUsers(tenantId?: string) {
    return prisma.user.findMany({
      where: tenantId === undefined ? undefined : { tenantId },
      orderBy: [{ tenantId: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  },
};
