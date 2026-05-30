import { Prisma, type StatusPengaduan } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import type { CreatePengaduanInput, UpdateStatusInput } from './pengaduan.schema';

export interface ListPengaduanOpts {
  status?: StatusPengaduan;
  page?: number;
  limit?: number;
}

const PENGADUAN_SELECT = {
  id: true,
  tenantId: true,
  judul: true,
  deskripsi: true,
  isAnonim: true,
  status: true,
  tanggapan: true,
  createdAt: true,
  updatedAt: true,
  warga: {
    select: {
      id: true,
      user: { select: { id: true, name: true } },
    },
  },
} as const;

export const pengaduanService = {
  async list(tenantId: string, opts: ListPengaduanOpts = {}) {
    const { status, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where: Prisma.PengaduanWhereInput = {
      tenantId,
      ...(status ? { status } : {}),
    };

    const [rawData, total] = await Promise.all([
      prisma.pengaduan.findMany({
        where,
        select: PENGADUAN_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pengaduan.count({ where }),
    ]);

    const data = rawData.map(maskAnonymous);
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(tenantId: string, id: string) {
    const pengaduan = await prisma.pengaduan.findFirst({
      where: { id, tenantId },
      select: PENGADUAN_SELECT,
    });
    if (!pengaduan) throw new AppError('Pengaduan tidak ditemukan', 404);
    return maskAnonymous(pengaduan);
  },

  async create(tenantId: string, userId: string, input: CreatePengaduanInput) {
    const isAnonim = input.isAnonim ?? false;
    let wargaId: string | null = null;

    if (!isAnonim) {
      const warga = await prisma.warga.findFirst({
        where: { rtId: tenantId, userId },
        select: { id: true },
      });
      if (!warga) throw new AppError('Profil warga tidak ditemukan', 404);
      wargaId = warga.id;
    }

    return prisma.pengaduan.create({
      data: {
        tenantId,
        wargaId,
        judul: input.judul,
        deskripsi: input.deskripsi,
        isAnonim,
        status: 'BARU',
      },
      select: PENGADUAN_SELECT,
    });
  },

  async updateStatus(tenantId: string, id: string, input: UpdateStatusInput) {
    const existing = await prisma.pengaduan.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new AppError('Pengaduan tidak ditemukan', 404);

    return prisma.pengaduan.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.tanggapan !== undefined ? { tanggapan: input.tanggapan } : {}),
      },
      select: PENGADUAN_SELECT,
    });
  },

  async getOwnerUserId(tenantId: string, id: string): Promise<string | null> {
    const pengaduan = await prisma.pengaduan.findFirst({
      where: { id, tenantId },
      select: { isAnonim: true, warga: { select: { userId: true } } },
    });
    if (!pengaduan || pengaduan.isAnonim) return null;
    return pengaduan.warga?.userId ?? null;
  },
};

type PengaduanRow = Awaited<ReturnType<typeof prisma.pengaduan.findFirst<{
  select: typeof PENGADUAN_SELECT;
}>>>;

function maskAnonymous(row: NonNullable<PengaduanRow>) {
  if (!row.isAnonim) return row;
  return { ...row, warga: null };
}
