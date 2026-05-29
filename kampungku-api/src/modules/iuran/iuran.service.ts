import { Prisma, type StatusIuran } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import type { CreateTagihanInput, BayarInput, VerifikasiInput } from './iuran.schema';

export interface ListIuranOpts {
  bulan?: number;
  tahun?: number;
  status?: StatusIuran;
}

const TAGIHAN_INCLUDE = {
  warga: {
    select: {
      id: true,
      userId: true,
      nik: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  jenisIuran: { select: { id: true, nama: true } },
} as const;

const isUniqueViolation = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

export const iuranService = {
  async list(tenantId: string, opts: ListIuranOpts = {}) {
    const where: Prisma.IuranTagihanWhereInput = {
      rtId: tenantId,
      ...(opts.bulan ? { bulan: opts.bulan } : {}),
      ...(opts.tahun ? { tahun: opts.tahun } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    };

    return prisma.iuranTagihan.findMany({
      where,
      include: TAGIHAN_INCLUDE,
      orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }],
    });
  },

  async getByWarga(tenantId: string, wargaId: string) {
    const warga = await prisma.warga.findFirst({
      where: { id: wargaId, rtId: tenantId },
      select: { id: true },
    });
    if (!warga) throw new AppError('Warga tidak ditemukan', 404);

    return prisma.iuranTagihan.findMany({
      where: { wargaId, rtId: tenantId },
      include: { jenisIuran: { select: { id: true, nama: true } } },
      orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }],
    });
  },

  async getTunggakan(tenantId: string) {
    return prisma.iuranTagihan.findMany({
      where: { rtId: tenantId, status: 'BELUM_BAYAR' },
      include: TAGIHAN_INCLUDE,
      orderBy: [{ tahun: 'asc' }, { bulan: 'asc' }],
    });
  },

  async createTagihan(tenantId: string, input: CreateTagihanInput) {
    const warga = await prisma.warga.findFirst({
      where: { id: input.wargaId, rtId: tenantId },
      select: { id: true },
    });
    if (!warga) throw new AppError('Warga tidak ditemukan', 404);

    const jenisIuran = await prisma.jenisIuran.findFirst({
      where: { id: input.jenisIuranId, tenantId },
    });
    if (!jenisIuran) throw new AppError('Jenis iuran tidak ditemukan', 404);
    if (!jenisIuran.isAktif) throw new AppError('Jenis iuran tidak aktif', 400);

    const jumlah = input.jumlah ?? Number(jenisIuran.jumlah);

    try {
      return await prisma.iuranTagihan.create({
        data: {
          wargaId: input.wargaId,
          jenisIuranId: input.jenisIuranId,
          rtId: tenantId,
          bulan: input.bulan,
          tahun: input.tahun,
          jumlah,
          catatan: input.catatan,
        },
        include: TAGIHAN_INCLUDE,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError('Tagihan untuk bulan dan jenis iuran ini sudah ada', 409);
      }
      throw err;
    }
  },

  async bayar(
    tenantId: string,
    input: BayarInput,
    performedBy: { id: string; role: string },
  ) {
    const tagihan = await prisma.iuranTagihan.findFirst({
      where: { id: input.tagihanId, rtId: tenantId },
      include: { warga: { select: { userId: true } } },
    });
    if (!tagihan) throw new AppError('Tagihan tidak ditemukan', 404);

    if (tagihan.status !== 'BELUM_BAYAR') {
      throw new AppError('Tagihan tidak dalam status BELUM_BAYAR', 400);
    }

    if (!['ADMIN', 'BENDAHARA'].includes(performedBy.role)) {
      if (tagihan.warga.userId !== performedBy.id) {
        throw new AppError('Tidak dapat membayar tagihan milik warga lain', 403);
      }
    }

    return prisma.iuranTagihan.update({
      where: { id: input.tagihanId },
      data: {
        status: 'MENUNGGU_VERIFIKASI',
        tglBayar: new Date(),
        catatan: input.catatan,
      },
    });
  },

  async verifikasi(
    tenantId: string,
    tagihanId: string,
    input: VerifikasiInput,
    verifiedById: string,
  ) {
    const tagihan = await prisma.iuranTagihan.findFirst({
      where: { id: tagihanId, rtId: tenantId },
    });
    if (!tagihan) throw new AppError('Tagihan tidak ditemukan', 404);

    if (tagihan.status !== 'MENUNGGU_VERIFIKASI') {
      throw new AppError('Tagihan tidak dalam status MENUNGGU_VERIFIKASI', 400);
    }

    return prisma.iuranTagihan.update({
      where: { id: tagihanId },
      data: {
        status: input.approve ? 'LUNAS' : 'BELUM_BAYAR',
        verifiedBy: verifiedById,
        catatan: input.catatan ?? tagihan.catatan ?? undefined,
        ...(input.approve ? {} : { tglBayar: null }),
      },
    });
  },

  async getLaporan(tenantId: string, opts: { bulan?: number; tahun?: number }) {
    const base: Prisma.IuranTagihanWhereInput = {
      rtId: tenantId,
      ...(opts.bulan ? { bulan: opts.bulan } : {}),
      ...(opts.tahun ? { tahun: opts.tahun } : {}),
    };

    const [totalTagihan, lunas, menunggu, belumBayar] = await Promise.all([
      prisma.iuranTagihan.count({ where: base }),
      prisma.iuranTagihan.aggregate({
        where: { ...base, status: 'LUNAS' },
        _sum: { jumlah: true },
        _count: true,
      }),
      prisma.iuranTagihan.aggregate({
        where: { ...base, status: 'MENUNGGU_VERIFIKASI' },
        _sum: { jumlah: true },
        _count: true,
      }),
      prisma.iuranTagihan.aggregate({
        where: { ...base, status: 'BELUM_BAYAR' },
        _sum: { jumlah: true },
        _count: true,
      }),
    ]);

    return {
      totalTagihan,
      lunas: { count: lunas._count, total: Number(lunas._sum.jumlah ?? 0) },
      menungguVerifikasi: { count: menunggu._count, total: Number(menunggu._sum.jumlah ?? 0) },
      belumBayar: { count: belumBayar._count, total: Number(belumBayar._sum.jumlah ?? 0) },
    };
  },

  async getOwnerUserIdByWargaId(tenantId: string, wargaId: string): Promise<string | null> {
    const warga = await prisma.warga.findFirst({
      where: { id: wargaId, rtId: tenantId },
      select: { userId: true },
    });
    return warga?.userId ?? null;
  },
};
