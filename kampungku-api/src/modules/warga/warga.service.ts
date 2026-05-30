import bcrypt from 'bcryptjs';
import { Prisma, type StatusTinggal } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import type {
  CreateWargaInput,
  UpdateWargaInput,
  CreateKeluargaInput,
  UpdateKeluargaInput,
} from './warga.schema';

export interface ListWargaOpts {
  search?: string;
  status?: StatusTinggal;
  page?: number;
  limit?: number;
}

const WARGA_SELECT = {
  id: true,
  nik: true,
  noKk: true,
  alamat: true,
  rtId: true,
  statusTinggal: true,
  tglMasuk: true,
  fotoProfilUrl: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
    },
  },
} as const;

const isUniqueViolation = (err: unknown, target: string): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError &&
  err.code === 'P2002' &&
  Array.isArray(err.meta?.target) &&
  (err.meta!.target as string[]).includes(target);

const isFkViolation = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError &&
  (err.code === 'P2003' || err.code === 'P2014');

export const wargaService = {
  async list(tenantId: string, opts: ListWargaOpts = {}) {
    const { search, status, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where: Prisma.WargaWhereInput = {
      rtId: tenantId,
      ...(status ? { statusTinggal: status } : {}),
      ...(search
        ? {
            OR: [
              { user: { name: { contains: search, mode: 'insensitive' } } },
              { nik: { contains: search } },
              { alamat: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.warga.findMany({
        where,
        select: WARGA_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.warga.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(tenantId: string, id: string) {
    const warga = await prisma.warga.findFirst({
      where: { id, rtId: tenantId },
      select: WARGA_SELECT,
    });
    if (!warga) throw new AppError('Warga tidak ditemukan', 404);
    return warga;
  },

  async create(tenantId: string, input: CreateWargaInput) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existingEmail) throw new AppError('Email sudah terdaftar', 409);

    const existingNik = await prisma.warga.findFirst({
      where: { rtId: tenantId, nik: input.nik },
      select: { id: true },
    });
    if (existingNik) throw new AppError('NIK sudah terdaftar di RT ini', 409);

    const passwordHash = await bcrypt.hash(input.password, 12);

    try {
      return await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            tenantId,
            name: input.name,
            email: input.email,
            phone: input.phone,
            passwordHash,
            role: 'WARGA',
          },
        });

        return tx.warga.create({
          data: {
            userId: user.id,
            rtId: tenantId,
            nik: input.nik,
            noKk: input.noKk,
            alamat: input.alamat,
            statusTinggal: input.statusTinggal,
            tglMasuk: input.tglMasuk ? new Date(input.tglMasuk) : undefined,
          },
          select: WARGA_SELECT,
        });
      });
    } catch (err) {
      if (isUniqueViolation(err, 'nik')) throw new AppError('NIK sudah terdaftar di RT ini', 409);
      if (isUniqueViolation(err, 'email')) throw new AppError('Email sudah terdaftar', 409);
      throw err;
    }
  },

  async update(tenantId: string, id: string, input: UpdateWargaInput) {
    const existing = await prisma.warga.findFirst({
      where: { id, rtId: tenantId },
      select: { id: true, userId: true, nik: true },
    });
    if (!existing) throw new AppError('Warga tidak ditemukan', 404);

    if (input.nik && input.nik !== existing.nik) {
      const nikConflict = await prisma.warga.findFirst({
        where: { rtId: tenantId, nik: input.nik, id: { not: id } },
        select: { id: true },
      });
      if (nikConflict) throw new AppError('NIK sudah terdaftar di RT ini', 409);
    }

    const { name, phone, ...wargaFields } = input;

    try {
      return await prisma.$transaction(async (tx) => {
        if (name !== undefined || phone !== undefined) {
          await tx.user.update({
            where: { id: existing.userId },
            data: {
              ...(name !== undefined ? { name } : {}),
              ...(phone !== undefined ? { phone } : {}),
            },
          });
        }

        return tx.warga.update({
          where: { id },
          data: {
            ...(wargaFields.nik !== undefined ? { nik: wargaFields.nik } : {}),
            ...(wargaFields.noKk !== undefined ? { noKk: wargaFields.noKk } : {}),
            ...(wargaFields.alamat !== undefined ? { alamat: wargaFields.alamat } : {}),
            ...(wargaFields.statusTinggal !== undefined
              ? { statusTinggal: wargaFields.statusTinggal }
              : {}),
            ...(wargaFields.tglMasuk !== undefined
              ? { tglMasuk: new Date(wargaFields.tglMasuk) }
              : {}),
          },
          select: WARGA_SELECT,
        });
      });
    } catch (err) {
      if (isUniqueViolation(err, 'nik')) throw new AppError('NIK sudah terdaftar di RT ini', 409);
      throw err;
    }
  },

  async delete(tenantId: string, id: string) {
    const warga = await prisma.warga.findFirst({
      where: { id, rtId: tenantId },
      select: { id: true, userId: true },
    });
    if (!warga) throw new AppError('Warga tidak ditemukan', 404);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.warga.delete({ where: { id } });
        await tx.user.delete({ where: { id: warga.userId } });
      });
    } catch (err) {
      if (isFkViolation(err)) {
        throw new AppError('Warga memiliki data terkait yang tidak dapat dihapus', 409);
      }
      throw err;
    }
  },

  async getOwnerUserId(tenantId: string, wargaId: string): Promise<string | null> {
    const warga = await prisma.warga.findFirst({
      where: { id: wargaId, rtId: tenantId },
      select: { userId: true },
    });
    return warga?.userId ?? null;
  },

  async listKeluarga(tenantId: string, wargaId: string) {
    const warga = await prisma.warga.findFirst({
      where: { id: wargaId, rtId: tenantId },
      select: { id: true },
    });
    if (!warga) throw new AppError('Warga tidak ditemukan', 404);

    return prisma.anggotaKeluarga.findMany({
      where: { wargaId },
      orderBy: { nama: 'asc' },
    });
  },

  async addKeluarga(tenantId: string, wargaId: string, input: CreateKeluargaInput) {
    const warga = await prisma.warga.findFirst({
      where: { id: wargaId, rtId: tenantId },
      select: { id: true },
    });
    if (!warga) throw new AppError('Warga tidak ditemukan', 404);

    return prisma.anggotaKeluarga.create({
      data: {
        wargaId,
        nama: input.nama,
        nik: input.nik,
        hubungan: input.hubungan,
        tglLahir: new Date(input.tglLahir),
        jenisKelamin: input.jenisKelamin,
        pekerjaan: input.pekerjaan,
        pendidikan: input.pendidikan,
      },
    });
  },

  async updateKeluarga(
    tenantId: string,
    wargaId: string,
    kidId: string,
    input: UpdateKeluargaInput,
  ) {
    const warga = await prisma.warga.findFirst({
      where: { id: wargaId, rtId: tenantId },
      select: { id: true },
    });
    if (!warga) throw new AppError('Warga tidak ditemukan', 404);

    const keluarga = await prisma.anggotaKeluarga.findFirst({
      where: { id: kidId, wargaId },
    });
    if (!keluarga) throw new AppError('Anggota keluarga tidak ditemukan', 404);

    return prisma.anggotaKeluarga.update({
      where: { id: kidId },
      data: {
        ...(input.nama !== undefined ? { nama: input.nama } : {}),
        ...(input.nik !== undefined ? { nik: input.nik } : {}),
        ...(input.hubungan !== undefined ? { hubungan: input.hubungan } : {}),
        ...(input.tglLahir !== undefined ? { tglLahir: new Date(input.tglLahir) } : {}),
        ...(input.jenisKelamin !== undefined ? { jenisKelamin: input.jenisKelamin } : {}),
        ...(input.pekerjaan !== undefined ? { pekerjaan: input.pekerjaan } : {}),
        ...(input.pendidikan !== undefined ? { pendidikan: input.pendidikan } : {}),
      },
    });
  },

  async deleteKeluarga(tenantId: string, wargaId: string, kidId: string) {
    const warga = await prisma.warga.findFirst({
      where: { id: wargaId, rtId: tenantId },
      select: { id: true },
    });
    if (!warga) throw new AppError('Warga tidak ditemukan', 404);

    const keluarga = await prisma.anggotaKeluarga.findFirst({
      where: { id: kidId, wargaId },
    });
    if (!keluarga) throw new AppError('Anggota keluarga tidak ditemukan', 404);

    await prisma.anggotaKeluarga.delete({ where: { id: kidId } });
  },

  async exportAll(tenantId: string, status?: StatusTinggal) {
    return prisma.warga.findMany({
      where: {
        rtId: tenantId,
        ...(status ? { statusTinggal: status } : {}),
      },
      select: {
        nik: true,
        noKk: true,
        alamat: true,
        statusTinggal: true,
        tglMasuk: true,
        user: { select: { name: true, email: true, phone: true } },
        anggotaKeluarga: {
          select: { nama: true, nik: true, hubungan: true, tglLahir: true, jenisKelamin: true, pekerjaan: true, pendidikan: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },
};
