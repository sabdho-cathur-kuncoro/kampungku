jest.mock('../../../config/database', () => ({
  prisma: {
    jenisIuran: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    iuranTagihan: {
      count: jest.fn(),
    },
  },
}));

import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { jenisIuranService } from '../jenis-iuran.service';

const TENANT_A = 'tenant-aaa';
const TENANT_B = 'tenant-bbb';
const JENIS_ID = 'jenis-uuid-1';

const mockJenis = {
  id: JENIS_ID,
  tenantId: TENANT_A,
  nama: 'Iuran RT',
  jumlah: 10000,
  keterangan: null,
  isAktif: true,
};

describe('jenisIuranService.list', () => {
  it('returns jenis iuran scoped to tenantId', async () => {
    (prisma.jenisIuran.findMany as jest.Mock).mockResolvedValue([mockJenis]);

    const result = await jenisIuranService.list(TENANT_A);

    expect(prisma.jenisIuran.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A }) }),
    );
    expect(result).toHaveLength(1);
  });

  it('cross-tenant isolation: tenant B query scoped to TENANT_B', async () => {
    (prisma.jenisIuran.findMany as jest.Mock).mockResolvedValue([]);

    await jenisIuranService.list(TENANT_B);

    expect(prisma.jenisIuran.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_B }) }),
    );
  });

  it('filters by isAktif when provided', async () => {
    (prisma.jenisIuran.findMany as jest.Mock).mockResolvedValue([mockJenis]);

    await jenisIuranService.list(TENANT_A, true);

    expect(prisma.jenisIuran.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT_A, isAktif: true }),
      }),
    );
  });

  it('omits isAktif filter when not provided', async () => {
    (prisma.jenisIuran.findMany as jest.Mock).mockResolvedValue([mockJenis]);

    await jenisIuranService.list(TENANT_A);

    const call = (prisma.jenisIuran.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).not.toHaveProperty('isAktif');
  });
});

describe('jenisIuranService.getById', () => {
  it('returns jenis when found in tenant', async () => {
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue(mockJenis);

    const result = await jenisIuranService.getById(TENANT_A, JENIS_ID);

    expect(prisma.jenisIuran.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: JENIS_ID, tenantId: TENANT_A } }),
    );
    expect(result.id).toBe(JENIS_ID);
  });

  it('throws 404 when not found in tenant', async () => {
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(jenisIuranService.getById(TENANT_B, JENIS_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Jenis iuran tidak ditemukan',
    });
  });
});

describe('jenisIuranService.create', () => {
  it('creates jenis iuran scoped to tenantId', async () => {
    (prisma.jenisIuran.create as jest.Mock).mockResolvedValue(mockJenis);

    await jenisIuranService.create(TENANT_A, { nama: 'Iuran RT', jumlah: 10000 });

    expect(prisma.jenisIuran.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: TENANT_A, nama: 'Iuran RT', jumlah: 10000 }),
      }),
    );
  });

  it('maps P2002 unique violation to 409', async () => {
    const dupErr = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: '5.0.0',
      meta: { target: ['tenant_id', 'nama'] },
    });
    (prisma.jenisIuran.create as jest.Mock).mockRejectedValue(dupErr);

    await expect(
      jenisIuranService.create(TENANT_A, { nama: 'Iuran RT', jumlah: 10000 }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('jenisIuranService.update', () => {
  it('updates fields when found in tenant', async () => {
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue({ id: JENIS_ID });
    (prisma.jenisIuran.update as jest.Mock).mockResolvedValue({ ...mockJenis, jumlah: 15000 });

    const result = await jenisIuranService.update(TENANT_A, JENIS_ID, { jumlah: 15000 });

    expect(prisma.jenisIuran.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: JENIS_ID },
        data: { jumlah: 15000 },
      }),
    );
    expect(result.jumlah).toBe(15000);
  });

  it('can deactivate via isAktif: false', async () => {
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue({ id: JENIS_ID });
    (prisma.jenisIuran.update as jest.Mock).mockResolvedValue({ ...mockJenis, isAktif: false });

    await jenisIuranService.update(TENANT_A, JENIS_ID, { isAktif: false });

    expect(prisma.jenisIuran.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isAktif: false } }),
    );
  });

  it('throws 404 when not found in tenant', async () => {
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      jenisIuranService.update(TENANT_B, JENIS_ID, { jumlah: 20000 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('maps P2002 on nama conflict to 409', async () => {
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue({ id: JENIS_ID });
    const dupErr = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: '5.0.0',
      meta: { target: ['tenant_id', 'nama'] },
    });
    (prisma.jenisIuran.update as jest.Mock).mockRejectedValue(dupErr);

    await expect(
      jenisIuranService.update(TENANT_A, JENIS_ID, { nama: 'Existing' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('jenisIuranService.delete', () => {
  it('deletes when no tagihan reference it', async () => {
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue({ id: JENIS_ID });
    (prisma.iuranTagihan.count as jest.Mock).mockResolvedValue(0);
    (prisma.jenisIuran.delete as jest.Mock).mockResolvedValue(undefined);

    await jenisIuranService.delete(TENANT_A, JENIS_ID);

    expect(prisma.jenisIuran.delete).toHaveBeenCalledWith({ where: { id: JENIS_ID } });
  });

  it('throws 409 when tagihan exist', async () => {
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue({ id: JENIS_ID });
    (prisma.iuranTagihan.count as jest.Mock).mockResolvedValue(3);

    await expect(jenisIuranService.delete(TENANT_A, JENIS_ID)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(prisma.jenisIuran.delete).not.toHaveBeenCalled();
  });

  it('throws 404 when not found in tenant', async () => {
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(jenisIuranService.delete(TENANT_B, JENIS_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
