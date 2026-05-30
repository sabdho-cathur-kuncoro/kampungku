import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import type { CreateJenisIuranInput, UpdateJenisIuranInput } from './jenis-iuran.schema';

const JENIS_SELECT = {
  id: true,
  tenantId: true,
  nama: true,
  jumlah: true,
  keterangan: true,
  isAktif: true,
} as const;

export const jenisIuranService = {
  async list(tenantId: string, aktif?: boolean) {
    return prisma.jenisIuran.findMany({
      where: {
        tenantId,
        ...(aktif !== undefined ? { isAktif: aktif } : {}),
      },
      select: JENIS_SELECT,
      orderBy: { nama: 'asc' },
    });
  },

  async getById(tenantId: string, id: string) {
    const jenis = await prisma.jenisIuran.findFirst({
      where: { id, tenantId },
      select: JENIS_SELECT,
    });
    if (!jenis) throw new AppError('Jenis iuran tidak ditemukan', 404);
    return jenis;
  },

  async create(tenantId: string, input: CreateJenisIuranInput) {
    try {
      return await prisma.jenisIuran.create({
        data: {
          tenantId,
          nama: input.nama,
          jumlah: input.jumlah,
          keterangan: input.keterangan,
        },
        select: JENIS_SELECT,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new AppError(`Jenis iuran "${input.nama}" sudah ada`, 409);
      }
      throw err;
    }
  },

  async update(tenantId: string, id: string, input: UpdateJenisIuranInput) {
    const existing = await prisma.jenisIuran.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new AppError('Jenis iuran tidak ditemukan', 404);

    try {
      return await prisma.jenisIuran.update({
        where: { id },
        data: {
          ...(input.nama !== undefined ? { nama: input.nama } : {}),
          ...(input.jumlah !== undefined ? { jumlah: input.jumlah } : {}),
          ...(input.keterangan !== undefined ? { keterangan: input.keterangan } : {}),
          ...(input.isAktif !== undefined ? { isAktif: input.isAktif } : {}),
        },
        select: JENIS_SELECT,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new AppError(`Jenis iuran "${input.nama}" sudah ada`, 409);
      }
      throw err;
    }
  },

  async delete(tenantId: string, id: string) {
    const existing = await prisma.jenisIuran.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new AppError('Jenis iuran tidak ditemukan', 404);

    const tagihanCount = await prisma.iuranTagihan.count({ where: { jenisIuranId: id } });
    if (tagihanCount > 0) {
      throw new AppError(
        'Jenis iuran tidak dapat dihapus karena sudah memiliki tagihan. Nonaktifkan saja.',
        409,
      );
    }

    await prisma.jenisIuran.delete({ where: { id } });
  },
};
