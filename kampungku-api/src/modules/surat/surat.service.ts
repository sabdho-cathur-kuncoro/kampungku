import { Prisma, type StatusSurat, type JenisSurat } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import type { AjukanSuratInput, TolakSuratInput } from './surat.schema';

export interface ListSuratOpts {
  status?: StatusSurat;
  jenisSurat?: JenisSurat;
  page?: number;
  limit?: number;
}

const SURAT_SELECT = {
  id: true,
  tenantId: true,
  jenisSurat: true,
  keperluan: true,
  status: true,
  noSurat: true,
  alasanTolak: true,
  tglDiajukan: true,
  tglDiproses: true,
  warga: {
    select: {
      id: true,
      nik: true,
      alamat: true,
      user: { select: { id: true, name: true } },
    },
  },
  approver: { select: { id: true, name: true } },
} as const;

const generateNoSurat = async (tenantId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.permohonanSurat.count({
    where: { tenantId, status: 'DISETUJUI' },
  });
  const seq = String(count + 1).padStart(3, '0');
  return `${seq}/SURAT/${year}`;
};

export const suratService = {
  async list(tenantId: string, opts: ListSuratOpts = {}) {
    const { status, jenisSurat, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where: Prisma.PermohonanSuratWhereInput = {
      tenantId,
      ...(status ? { status } : {}),
      ...(jenisSurat ? { jenisSurat } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.permohonanSurat.findMany({
        where,
        select: SURAT_SELECT,
        orderBy: { tglDiajukan: 'desc' },
        skip,
        take: limit,
      }),
      prisma.permohonanSurat.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async listSaya(tenantId: string, userId: string, opts: ListSuratOpts = {}) {
    const warga = await prisma.warga.findFirst({
      where: { rtId: tenantId, userId },
      select: { id: true },
    });
    if (!warga) throw new AppError('Profil warga tidak ditemukan', 404);

    const { status, jenisSurat, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where: Prisma.PermohonanSuratWhereInput = {
      tenantId,
      wargaId: warga.id,
      ...(status ? { status } : {}),
      ...(jenisSurat ? { jenisSurat } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.permohonanSurat.findMany({
        where,
        select: SURAT_SELECT,
        orderBy: { tglDiajukan: 'desc' },
        skip,
        take: limit,
      }),
      prisma.permohonanSurat.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(tenantId: string, id: string) {
    const surat = await prisma.permohonanSurat.findFirst({
      where: { id, tenantId },
      select: SURAT_SELECT,
    });
    if (!surat) throw new AppError('Permohonan surat tidak ditemukan', 404);
    return surat;
  },

  async ajukan(tenantId: string, userId: string, input: AjukanSuratInput) {
    const warga = await prisma.warga.findFirst({
      where: { rtId: tenantId, userId },
      select: { id: true },
    });
    if (!warga) throw new AppError('Profil warga tidak ditemukan', 404);

    return prisma.permohonanSurat.create({
      data: {
        tenantId,
        wargaId: warga.id,
        jenisSurat: input.jenisSurat,
        keperluan: input.keperluan,
        status: 'DIAJUKAN',
      },
      select: SURAT_SELECT,
    });
  },

  async approve(tenantId: string, id: string, approverId: string) {
    const existing = await prisma.permohonanSurat.findFirst({
      where: { id, tenantId },
      select: { id: true, status: true },
    });
    if (!existing) throw new AppError('Permohonan surat tidak ditemukan', 404);
    if (existing.status !== 'DIAJUKAN') {
      throw new AppError('Hanya permohonan berstatus DIAJUKAN yang dapat disetujui', 400);
    }

    const noSurat = await generateNoSurat(tenantId);

    return prisma.permohonanSurat.update({
      where: { id },
      data: {
        status: 'DISETUJUI',
        noSurat,
        approvedBy: approverId,
        tglDiproses: new Date(),
      },
      select: SURAT_SELECT,
    });
  },

  async tolak(tenantId: string, id: string, approverId: string, input: TolakSuratInput) {
    const existing = await prisma.permohonanSurat.findFirst({
      where: { id, tenantId },
      select: { id: true, status: true },
    });
    if (!existing) throw new AppError('Permohonan surat tidak ditemukan', 404);
    if (existing.status !== 'DIAJUKAN') {
      throw new AppError('Hanya permohonan berstatus DIAJUKAN yang dapat ditolak', 400);
    }

    return prisma.permohonanSurat.update({
      where: { id },
      data: {
        status: 'DITOLAK',
        alasanTolak: input.alasanTolak,
        approvedBy: approverId,
        tglDiproses: new Date(),
      },
      select: SURAT_SELECT,
    });
  },

  async getForDownload(tenantId: string, id: string) {
    const surat = await prisma.permohonanSurat.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        noSurat: true,
        jenisSurat: true,
        keperluan: true,
        status: true,
        tglDiproses: true,
        warga: {
          select: {
            nik: true,
            alamat: true,
            user: { select: { name: true } },
          },
        },
        tenant: { select: { nama: true } },
      },
    });
    if (!surat) throw new AppError('Permohonan surat tidak ditemukan', 404);
    if (surat.status !== 'DISETUJUI') {
      throw new AppError('Surat hanya dapat diunduh setelah disetujui', 400);
    }
    return surat;
  },

  async getOwnerUserId(tenantId: string, id: string): Promise<string | null> {
    const surat = await prisma.permohonanSurat.findFirst({
      where: { id, tenantId },
      select: { warga: { select: { userId: true } } },
    });
    return surat?.warga?.userId ?? null;
  },
};
