import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import type {
  CreateUserInput,
  UpdateProfileInput,
  ChangeRoleInput,
  ChangePasswordInput,
} from './user.schema';

const USER_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface ListUsersOpts {
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export const userService = {
  async list(tenantId: string, opts: ListUsersOpts = {}) {
    const { role, isActive, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      tenantId,
      ...(role ? { role: role as Prisma.EnumRoleFilter } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(tenantId: string, id: string) {
    const user = await prisma.user.findFirst({
      where: { id, tenantId },
      select: USER_SELECT,
    });
    if (!user) throw new AppError('User tidak ditemukan', 404);
    return user;
  },

  async create(tenantId: string, input: CreateUserInput) {
    const passwordHash = await bcrypt.hash(input.password, 12);

    try {
      return await prisma.user.create({
        data: {
          tenantId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash,
          role: input.role,
          isActive: true,
        },
        select: USER_SELECT,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new AppError('Email sudah terdaftar', 409);
      }
      throw err;
    }
  },

  async updateProfile(tenantId: string, id: string, input: UpdateProfileInput) {
    const existing = await prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new AppError('User tidak ditemukan', 404);

    return prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
      },
      select: USER_SELECT,
    });
  },

  async changeRole(tenantId: string, id: string, input: ChangeRoleInput) {
    const existing = await prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true, role: true },
    });
    if (!existing) throw new AppError('User tidak ditemukan', 404);

    return prisma.user.update({
      where: { id },
      data: { role: input.role },
      select: USER_SELECT,
    });
  },

  async changePassword(
    tenantId: string,
    id: string,
    input: ChangePasswordInput,
    requesterId: string,
    requesterRole: string,
  ) {
    const user = await prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new AppError('User tidak ditemukan', 404);

    const isSelf = requesterId === id;
    const isAdmin = requesterRole === 'ADMIN' || requesterRole === 'SUPER_ADMIN';

    if (isSelf) {
      // Self-change requires old password verification
      if (!input.oldPassword) {
        throw new AppError('Password lama diperlukan', 400);
      }
      const valid = await bcrypt.compare(input.oldPassword, user.passwordHash);
      if (!valid) throw new AppError('Password lama tidak sesuai', 400);
    } else if (!isAdmin) {
      throw new AppError('Tidak memiliki akses', 403);
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  async setActive(tenantId: string, id: string, isActive: boolean) {
    const existing = await prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new AppError('User tidak ditemukan', 404);

    return prisma.user.update({
      where: { id },
      data: { isActive },
      select: USER_SELECT,
    });
  },

  async delete(tenantId: string, id: string, requesterId: string) {
    const existing = await prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new AppError('User tidak ditemukan', 404);
    if (id === requesterId) throw new AppError('Tidak dapat menghapus akun sendiri', 400);

    await prisma.user.delete({ where: { id } });
  },
};
