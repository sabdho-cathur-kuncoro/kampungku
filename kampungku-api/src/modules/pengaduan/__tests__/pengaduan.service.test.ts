jest.mock('../../../config/database', () => ({
  prisma: {
    pengaduan: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    warga: {
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from '../../../config/database';
import { pengaduanService } from '../pengaduan.service';

const TENANT_A = 'tenant-aaa';
const TENANT_B = 'tenant-bbb';
const USER_ID = 'user-uuid-1';
const WARGA_ID = 'warga-uuid-1';
const PAD_ID = 'pengaduan-uuid-1';

const mockPengaduan = {
  id: PAD_ID,
  tenantId: TENANT_A,
  judul: 'Jalan rusak',
  deskripsi: 'Jalan di depan RT sudah rusak parah',
  isAnonim: false,
  status: 'BARU' as const,
  tanggapan: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  warga: { id: WARGA_ID, user: { id: USER_ID, name: 'Budi' } },
};

const mockAnonim = { ...mockPengaduan, id: 'anon-id', isAnonim: true };
const mockWarga = { id: WARGA_ID };

describe('pengaduanService.list', () => {
  it('filters by tenantId', async () => {
    (prisma.pengaduan.findMany as jest.Mock).mockResolvedValue([mockPengaduan]);
    (prisma.pengaduan.count as jest.Mock).mockResolvedValue(1);

    const result = await pengaduanService.list(TENANT_A);

    expect(prisma.pengaduan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A }) }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('cross-tenant isolation: tenant B query scoped to TENANT_B only', async () => {
    (prisma.pengaduan.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.pengaduan.count as jest.Mock).mockResolvedValue(0);

    const result = await pengaduanService.list(TENANT_B);

    expect(prisma.pengaduan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_B }) }),
    );
    expect(result.data).toHaveLength(0);
  });

  it('filters by status when provided', async () => {
    (prisma.pengaduan.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.pengaduan.count as jest.Mock).mockResolvedValue(0);

    await pengaduanService.list(TENANT_A, { status: 'DIPROSES' });

    expect(prisma.pengaduan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT_A, status: 'DIPROSES' }),
      }),
    );
  });

  it('masks warga field on anonymous pengaduan', async () => {
    (prisma.pengaduan.findMany as jest.Mock).mockResolvedValue([mockAnonim]);
    (prisma.pengaduan.count as jest.Mock).mockResolvedValue(1);

    const result = await pengaduanService.list(TENANT_A);

    expect(result.data[0].warga).toBeNull();
  });

  it('preserves warga field on non-anonymous pengaduan', async () => {
    (prisma.pengaduan.findMany as jest.Mock).mockResolvedValue([mockPengaduan]);
    (prisma.pengaduan.count as jest.Mock).mockResolvedValue(1);

    const result = await pengaduanService.list(TENANT_A);

    expect(result.data[0].warga).not.toBeNull();
  });

  it('applies correct pagination', async () => {
    (prisma.pengaduan.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.pengaduan.count as jest.Mock).mockResolvedValue(40);

    const result = await pengaduanService.list(TENANT_A, { page: 2, limit: 10 });

    expect(prisma.pengaduan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
    expect(result.meta).toMatchObject({ page: 2, limit: 10, total: 40, totalPages: 4 });
  });
});

describe('pengaduanService.getById', () => {
  it('returns pengaduan when found in tenant', async () => {
    (prisma.pengaduan.findFirst as jest.Mock).mockResolvedValue(mockPengaduan);

    const result = await pengaduanService.getById(TENANT_A, PAD_ID);

    expect(prisma.pengaduan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PAD_ID, tenantId: TENANT_A } }),
    );
    expect(result.id).toBe(PAD_ID);
  });

  it('masks warga on anonymous', async () => {
    (prisma.pengaduan.findFirst as jest.Mock).mockResolvedValue(mockAnonim);

    const result = await pengaduanService.getById(TENANT_A, 'anon-id');

    expect(result.warga).toBeNull();
  });

  it('throws 404 when not found in tenant', async () => {
    (prisma.pengaduan.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(pengaduanService.getById(TENANT_B, PAD_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Pengaduan tidak ditemukan',
    });
  });
});

describe('pengaduanService.create', () => {
  it('creates non-anonymous pengaduan with wargaId', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(mockWarga);
    (prisma.pengaduan.create as jest.Mock).mockResolvedValue(mockPengaduan);

    await pengaduanService.create(TENANT_A, USER_ID, {
      judul: 'Jalan rusak parah',
      deskripsi: 'Jalan di depan sudah rusak dan berbahaya untuk kendaraan',
      isAnonim: false,
    });

    expect(prisma.pengaduan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT_A,
          wargaId: WARGA_ID,
          isAnonim: false,
          status: 'BARU',
        }),
      }),
    );
  });

  it('creates anonymous pengaduan with wargaId null', async () => {
    (prisma.pengaduan.create as jest.Mock).mockResolvedValue({ ...mockAnonim, wargaId: null });

    await pengaduanService.create(TENANT_A, USER_ID, {
      judul: 'Pengaduan anonim',
      deskripsi: 'Deskripsi pengaduan yang cukup panjang untuk validasi',
      isAnonim: true,
    });

    expect(prisma.warga.findFirst).not.toHaveBeenCalled();
    expect(prisma.pengaduan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ wargaId: null, isAnonim: true }),
      }),
    );
  });

  it('defaults isAnonim to false', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(mockWarga);
    (prisma.pengaduan.create as jest.Mock).mockResolvedValue(mockPengaduan);

    await pengaduanService.create(TENANT_A, USER_ID, {
      judul: 'Judul pengaduan',
      deskripsi: 'Deskripsi yang cukup panjang untuk memenuhi validasi minimum',
    });

    expect(prisma.pengaduan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isAnonim: false }),
      }),
    );
  });

  it('throws 404 when non-anonymous warga not in tenant', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      pengaduanService.create(TENANT_A, 'ghost', {
        judul: 'Judul pengaduan',
        deskripsi: 'Deskripsi yang cukup untuk memenuhi validasi',
        isAnonim: false,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('pengaduanService.updateStatus', () => {
  it('updates status and tanggapan', async () => {
    (prisma.pengaduan.findFirst as jest.Mock).mockResolvedValue({ id: PAD_ID });
    (prisma.pengaduan.update as jest.Mock).mockResolvedValue({
      ...mockPengaduan,
      status: 'DIPROSES',
      tanggapan: 'Sedang ditindaklanjuti',
    });

    const result = await pengaduanService.updateStatus(TENANT_A, PAD_ID, {
      status: 'DIPROSES',
      tanggapan: 'Sedang ditindaklanjuti',
    });

    expect(prisma.pengaduan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PAD_ID },
        data: expect.objectContaining({ status: 'DIPROSES', tanggapan: 'Sedang ditindaklanjuti' }),
      }),
    );
    expect(result.status).toBe('DIPROSES');
  });

  it('updates status without tanggapan', async () => {
    (prisma.pengaduan.findFirst as jest.Mock).mockResolvedValue({ id: PAD_ID });
    (prisma.pengaduan.update as jest.Mock).mockResolvedValue({ ...mockPengaduan, status: 'SELESAI' });

    await pengaduanService.updateStatus(TENANT_A, PAD_ID, { status: 'SELESAI' });

    expect(prisma.pengaduan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'SELESAI' },
      }),
    );
  });

  it('throws 404 when not found in tenant', async () => {
    (prisma.pengaduan.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      pengaduanService.updateStatus(TENANT_B, PAD_ID, { status: 'SELESAI' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('pengaduanService.getOwnerUserId', () => {
  it('returns userId for non-anonymous pengaduan', async () => {
    (prisma.pengaduan.findFirst as jest.Mock).mockResolvedValue({
      isAnonim: false,
      warga: { userId: USER_ID },
    });

    const result = await pengaduanService.getOwnerUserId(TENANT_A, PAD_ID);

    expect(result).toBe(USER_ID);
  });

  it('returns null for anonymous pengaduan (prevents owner-bypass)', async () => {
    (prisma.pengaduan.findFirst as jest.Mock).mockResolvedValue({
      isAnonim: true,
      warga: { userId: USER_ID },
    });

    const result = await pengaduanService.getOwnerUserId(TENANT_A, PAD_ID);

    expect(result).toBeNull();
  });

  it('returns null when not found', async () => {
    (prisma.pengaduan.findFirst as jest.Mock).mockResolvedValue(null);

    expect(await pengaduanService.getOwnerUserId(TENANT_B, PAD_ID)).toBeNull();
  });
});
