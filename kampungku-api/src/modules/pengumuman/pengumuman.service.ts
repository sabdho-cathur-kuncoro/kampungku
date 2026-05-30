import { Prisma, type KategoriPengumuman } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import type { CreatePengumumanInput, UpdatePengumumanInput } from './pengumuman.schema';

export interface ListPengumumanOpts {
  kategori?: KategoriPengumuman;
  isPinned?: boolean;
  page?: number;
  limit?: number;
}

const PENGUMUMAN_SELECT = {
  id: true,
  judul: true,
  konten: true,
  kategori: true,
  isPinned: true,
  tglMulai: true,
  tglSelesai: true,
  rtId: true,
  createdAt: true,
  author: { select: { id: true, name: true, role: true } },
} as const;

export const pengumumanService = {
  async list(tenantId: string, opts: ListPengumumanOpts = {}) {
    const { kategori, isPinned, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where: Prisma.PengumumanWhereInput = {
      rtId: tenantId,
      ...(kategori ? { kategori } : {}),
      ...(isPinned !== undefined ? { isPinned } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.pengumuman.findMany({
        where,
        select: PENGUMUMAN_SELECT,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.pengumuman.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(tenantId: string, id: string) {
    const pengumuman = await prisma.pengumuman.findFirst({
      where: { id, rtId: tenantId },
      select: PENGUMUMAN_SELECT,
    });
    if (!pengumuman) throw new AppError('Pengumuman tidak ditemukan', 404);
    return pengumuman;
  },

  async create(tenantId: string, authorId: string, input: CreatePengumumanInput) {
    return prisma.pengumuman.create({
      data: {
        rtId: tenantId,
        authorId,
        judul: input.judul,
        konten: input.konten,
        kategori: input.kategori,
        tglMulai: new Date(input.tglMulai),
        tglSelesai: input.tglSelesai ? new Date(input.tglSelesai) : undefined,
        isPinned: input.isPinned ?? false,
      },
      select: PENGUMUMAN_SELECT,
    });
  },

  async update(tenantId: string, id: string, input: UpdatePengumumanInput) {
    const existing = await prisma.pengumuman.findFirst({
      where: { id, rtId: tenantId },
      select: { id: true },
    });
    if (!existing) throw new AppError('Pengumuman tidak ditemukan', 404);

    return prisma.pengumuman.update({
      where: { id },
      data: {
        ...(input.judul !== undefined ? { judul: input.judul } : {}),
        ...(input.konten !== undefined ? { konten: input.konten } : {}),
        ...(input.kategori !== undefined ? { kategori: input.kategori } : {}),
        ...(input.tglMulai !== undefined ? { tglMulai: new Date(input.tglMulai) } : {}),
        ...(input.tglSelesai !== undefined ? { tglSelesai: new Date(input.tglSelesai) } : {}),
        ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
      },
      select: PENGUMUMAN_SELECT,
    });
  },

  async delete(tenantId: string, id: string) {
    const existing = await prisma.pengumuman.findFirst({
      where: { id, rtId: tenantId },
      select: { id: true },
    });
    if (!existing) throw new AppError('Pengumuman tidak ditemukan', 404);

    await prisma.pengumuman.delete({ where: { id } });
  },

  async getAuthorId(tenantId: string, id: string): Promise<string | null> {
    const pengumuman = await prisma.pengumuman.findFirst({
      where: { id, rtId: tenantId },
      select: { authorId: true },
    });
    return pengumuman?.authorId ?? null;
  },
};
