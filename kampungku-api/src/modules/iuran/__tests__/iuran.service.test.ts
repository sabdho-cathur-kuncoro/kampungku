jest.mock('../../../config/database', () => ({
  prisma: {
    iuranTagihan: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    warga: {
      findFirst: jest.fn(),
    },
    jenisIuran: {
      findFirst: jest.fn(),
    },
  },
}));

import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { iuranService } from '../iuran.service';

const TENANT_ID = 'tenant-abc';
const WARGA_ID = 'warga-uuid-1';
const USER_ID = 'user-uuid-1';
const JENIS_ID = 'jenis-uuid-1';
const TAGIHAN_ID = 'tagihan-uuid-1';

const mockTagihan = {
  id: TAGIHAN_ID,
  wargaId: WARGA_ID,
  jenisIuranId: JENIS_ID,
  rtId: TENANT_ID,
  bulan: 5,
  tahun: 2026,
  jumlah: 50000,
  status: 'BELUM_BAYAR' as const,
  tglBayar: null,
  verifiedBy: null,
  catatan: null,
  createdAt: new Date(),
  warga: { id: WARGA_ID, userId: USER_ID, nik: '1234567890123456', user: { id: USER_ID, name: 'Budi', email: 'budi@example.com' } },
  jenisIuran: { id: JENIS_ID, nama: 'Iuran RT' },
};

const mockJenisIuran = {
  id: JENIS_ID,
  tenantId: TENANT_ID,
  nama: 'Iuran RT',
  jumlah: new Prisma.Decimal(50000),
  keterangan: null,
  isAktif: true,
};

describe('iuranService.list', () => {
  it('returns tagihan filtered by tenant', async () => {
    (prisma.iuranTagihan.findMany as jest.Mock).mockResolvedValue([mockTagihan]);

    const result = await iuranService.list(TENANT_ID);

    expect(result).toHaveLength(1);
    expect(prisma.iuranTagihan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ rtId: TENANT_ID }) }),
    );
  });

  it('filters by bulan, tahun, status when provided', async () => {
    (prisma.iuranTagihan.findMany as jest.Mock).mockResolvedValue([]);

    await iuranService.list(TENANT_ID, { bulan: 5, tahun: 2026, status: 'BELUM_BAYAR' });

    expect(prisma.iuranTagihan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ bulan: 5, tahun: 2026, status: 'BELUM_BAYAR' }),
      }),
    );
  });
});

describe('iuranService.getByWarga', () => {
  it('returns tagihan for warga in tenant', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.iuranTagihan.findMany as jest.Mock).mockResolvedValue([mockTagihan]);

    const result = await iuranService.getByWarga(TENANT_ID, WARGA_ID);

    expect(result).toHaveLength(1);
  });

  it('throws 404 when warga not in tenant', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(iuranService.getByWarga(TENANT_ID, 'missing')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Warga tidak ditemukan',
    });
  });
});

describe('iuranService.getTunggakan', () => {
  it('returns only BELUM_BAYAR tagihan', async () => {
    (prisma.iuranTagihan.findMany as jest.Mock).mockResolvedValue([mockTagihan]);

    const result = await iuranService.getTunggakan(TENANT_ID);

    expect(prisma.iuranTagihan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ rtId: TENANT_ID, status: 'BELUM_BAYAR' }),
      }),
    );
    expect(result).toHaveLength(1);
  });
});

describe('iuranService.createTagihan', () => {
  const validInput = {
    wargaId: WARGA_ID,
    jenisIuranId: JENIS_ID,
    bulan: 5,
    tahun: 2026,
  };

  it('creates tagihan using jenisIuran amount when jumlah not provided', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue(mockJenisIuran);
    (prisma.iuranTagihan.create as jest.Mock).mockResolvedValue(mockTagihan);

    const result = await iuranService.createTagihan(TENANT_ID, validInput);

    expect(prisma.iuranTagihan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ jumlah: 50000, rtId: TENANT_ID }),
      }),
    );
    expect(result).toEqual(mockTagihan);
  });

  it('uses override jumlah when provided', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue(mockJenisIuran);
    (prisma.iuranTagihan.create as jest.Mock).mockResolvedValue({ ...mockTagihan, jumlah: 75000 });

    await iuranService.createTagihan(TENANT_ID, { ...validInput, jumlah: 75000 });

    expect(prisma.iuranTagihan.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ jumlah: 75000 }) }),
    );
  });

  it('throws 404 when warga not in tenant', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(iuranService.createTagihan(TENANT_ID, validInput)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Warga tidak ditemukan',
    });
  });

  it('throws 404 when jenisIuran not in tenant', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(iuranService.createTagihan(TENANT_ID, validInput)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Jenis iuran tidak ditemukan',
    });
  });

  it('throws 400 when jenisIuran is inactive', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue({ ...mockJenisIuran, isAktif: false });

    await expect(iuranService.createTagihan(TENANT_ID, validInput)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Jenis iuran tidak aktif',
    });
  });

  it('maps unique violation to 409', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue(mockJenisIuran);

    const dupErr = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: '5.0.0',
      meta: { target: ['warga_id', 'jenis_iuran_id', 'bulan', 'tahun'] },
    });
    (prisma.iuranTagihan.create as jest.Mock).mockRejectedValue(dupErr);

    await expect(iuranService.createTagihan(TENANT_ID, validInput)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe('iuranService.bayar', () => {
  const tagihanBelumBayar = {
    ...mockTagihan,
    status: 'BELUM_BAYAR' as const,
    warga: { userId: USER_ID },
  };

  it('updates status to MENUNGGU_VERIFIKASI', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue(tagihanBelumBayar);
    (prisma.iuranTagihan.update as jest.Mock).mockResolvedValue({
      ...tagihanBelumBayar,
      status: 'MENUNGGU_VERIFIKASI',
    });

    const result = await iuranService.bayar(
      TENANT_ID,
      { tagihanId: TAGIHAN_ID },
      { id: USER_ID, role: 'WARGA' },
    );

    expect(prisma.iuranTagihan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'MENUNGGU_VERIFIKASI' }) }),
    );
    expect(result.status).toBe('MENUNGGU_VERIFIKASI');
  });

  it('ADMIN can pay for any warga', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue(tagihanBelumBayar);
    (prisma.iuranTagihan.update as jest.Mock).mockResolvedValue({ ...tagihanBelumBayar, status: 'MENUNGGU_VERIFIKASI' });

    await expect(
      iuranService.bayar(TENANT_ID, { tagihanId: TAGIHAN_ID }, { id: 'other-admin', role: 'ADMIN' }),
    ).resolves.toBeDefined();
  });

  it('non-admin cannot pay another warga tagihan', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue(tagihanBelumBayar);

    await expect(
      iuranService.bayar(TENANT_ID, { tagihanId: TAGIHAN_ID }, { id: 'other-user', role: 'WARGA' }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 400 when tagihan not BELUM_BAYAR', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue({
      ...tagihanBelumBayar,
      status: 'LUNAS',
    });

    await expect(
      iuranService.bayar(TENANT_ID, { tagihanId: TAGIHAN_ID }, { id: USER_ID, role: 'WARGA' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 when tagihan not found', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      iuranService.bayar(TENANT_ID, { tagihanId: 'missing' }, { id: USER_ID, role: 'WARGA' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('iuranService.verifikasi', () => {
  const tagihanMenunggu = {
    ...mockTagihan,
    status: 'MENUNGGU_VERIFIKASI' as const,
    catatan: null,
  };

  it('approves tagihan → status LUNAS', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue(tagihanMenunggu);
    (prisma.iuranTagihan.update as jest.Mock).mockResolvedValue({ ...tagihanMenunggu, status: 'LUNAS' });

    const result = await iuranService.verifikasi(TENANT_ID, TAGIHAN_ID, { approve: true }, USER_ID);

    expect(prisma.iuranTagihan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'LUNAS', verifiedBy: USER_ID }),
      }),
    );
    expect(result.status).toBe('LUNAS');
  });

  it('rejects tagihan → status BELUM_BAYAR, clears tglBayar', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue(tagihanMenunggu);
    (prisma.iuranTagihan.update as jest.Mock).mockResolvedValue({ ...tagihanMenunggu, status: 'BELUM_BAYAR' });

    await iuranService.verifikasi(TENANT_ID, TAGIHAN_ID, { approve: false }, USER_ID);

    expect(prisma.iuranTagihan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'BELUM_BAYAR', tglBayar: null }),
      }),
    );
  });

  it('throws 400 when tagihan not MENUNGGU_VERIFIKASI', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue({ ...tagihanMenunggu, status: 'LUNAS' });

    await expect(
      iuranService.verifikasi(TENANT_ID, TAGIHAN_ID, { approve: true }, USER_ID),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 when not found', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      iuranService.verifikasi(TENANT_ID, 'missing', { approve: true }, USER_ID),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('iuranService.getLaporan', () => {
  it('returns aggregated totals per status', async () => {
    (prisma.iuranTagihan.count as jest.Mock).mockResolvedValue(10);
    (prisma.iuranTagihan.aggregate as jest.Mock).mockResolvedValue({
      _count: 5,
      _sum: { jumlah: new Prisma.Decimal(250000) },
    });

    const result = await iuranService.getLaporan(TENANT_ID, { tahun: 2026, bulan: 5 });

    expect(result.totalTagihan).toBe(10);
    expect(result.lunas.count).toBe(5);
    expect(result.lunas.total).toBe(250000);
    expect(result.menungguVerifikasi).toBeDefined();
    expect(result.belumBayar).toBeDefined();
  });
});

describe('iuranService.getOwnerUserIdByWargaId', () => {
  it('returns userId when warga exists in tenant', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ userId: USER_ID });

    const result = await iuranService.getOwnerUserIdByWargaId(TENANT_ID, WARGA_ID);

    expect(result).toBe(USER_ID);
  });

  it('returns null when not found', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    expect(await iuranService.getOwnerUserIdByWargaId(TENANT_ID, 'x')).toBeNull();
  });
});
