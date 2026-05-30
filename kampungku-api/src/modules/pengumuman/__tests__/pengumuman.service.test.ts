jest.mock('../../../config/database', () => ({
  prisma: {
    pengumuman: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from '../../../config/database';
import { pengumumanService } from '../pengumuman.service';

const TENANT_A = 'tenant-aaa';
const TENANT_B = 'tenant-bbb';
const AUTHOR_ID = 'user-uuid-1';
const PID = 'pengumuman-uuid-1';

const mockPengumuman = {
  id: PID,
  judul: 'Pengumuman RT',
  konten: 'Isi pengumuman',
  kategori: 'UMUM' as const,
  isPinned: false,
  tglMulai: new Date('2026-05-01'),
  tglSelesai: null,
  rtId: TENANT_A,
  createdAt: new Date(),
  author: { id: AUTHOR_ID, name: 'Pak RT', role: 'KETUA_RT' },
};

describe('pengumumanService.list', () => {
  it('returns pengumuman filtered by tenantId', async () => {
    (prisma.pengumuman.findMany as jest.Mock).mockResolvedValue([mockPengumuman]);
    (prisma.pengumuman.count as jest.Mock).mockResolvedValue(1);

    const result = await pengumumanService.list(TENANT_A);

    expect(prisma.pengumuman.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ rtId: TENANT_A }) }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('cross-tenant isolation: tenant B cannot see tenant A data', async () => {
    (prisma.pengumuman.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.pengumuman.count as jest.Mock).mockResolvedValue(0);

    const result = await pengumumanService.list(TENANT_B);

    expect(prisma.pengumuman.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ rtId: TENANT_B }) }),
    );
    expect(result.data).toHaveLength(0);
  });

  it('filters by kategori when provided', async () => {
    (prisma.pengumuman.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.pengumuman.count as jest.Mock).mockResolvedValue(0);

    await pengumumanService.list(TENANT_A, { kategori: 'DARURAT' });

    expect(prisma.pengumuman.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ rtId: TENANT_A, kategori: 'DARURAT' }),
      }),
    );
  });

  it('filters by isPinned when provided', async () => {
    (prisma.pengumuman.findMany as jest.Mock).mockResolvedValue([{ ...mockPengumuman, isPinned: true }]);
    (prisma.pengumuman.count as jest.Mock).mockResolvedValue(1);

    await pengumumanService.list(TENANT_A, { isPinned: true });

    expect(prisma.pengumuman.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ rtId: TENANT_A, isPinned: true }),
      }),
    );
  });

  it('applies correct pagination', async () => {
    (prisma.pengumuman.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.pengumuman.count as jest.Mock).mockResolvedValue(50);

    const result = await pengumumanService.list(TENANT_A, { page: 3, limit: 10 });

    expect(prisma.pengumuman.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
    expect(result.meta).toMatchObject({ page: 3, limit: 10, total: 50, totalPages: 5 });
  });
});

describe('pengumumanService.getById', () => {
  it('returns pengumuman when found in tenant', async () => {
    (prisma.pengumuman.findFirst as jest.Mock).mockResolvedValue(mockPengumuman);

    const result = await pengumumanService.getById(TENANT_A, PID);

    expect(prisma.pengumuman.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PID, rtId: TENANT_A } }),
    );
    expect(result.id).toBe(PID);
  });

  it('throws 404 when pengumuman not in tenant', async () => {
    (prisma.pengumuman.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(pengumumanService.getById(TENANT_B, PID)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Pengumuman tidak ditemukan',
    });
  });
});

describe('pengumumanService.create', () => {
  const validInput = {
    judul: 'Judul pengumuman baru',
    konten: 'Isi pengumuman yang cukup panjang',
    kategori: 'UMUM' as const,
    tglMulai: '2026-06-01',
  };

  it('creates pengumuman scoped to tenantId', async () => {
    (prisma.pengumuman.create as jest.Mock).mockResolvedValue(mockPengumuman);

    await pengumumanService.create(TENANT_A, AUTHOR_ID, validInput);

    expect(prisma.pengumuman.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ rtId: TENANT_A, authorId: AUTHOR_ID }),
      }),
    );
  });

  it('sets isPinned false by default', async () => {
    (prisma.pengumuman.create as jest.Mock).mockResolvedValue(mockPengumuman);

    await pengumumanService.create(TENANT_A, AUTHOR_ID, validInput);

    expect(prisma.pengumuman.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPinned: false }),
      }),
    );
  });
});

describe('pengumumanService.update', () => {
  it('updates when pengumuman belongs to tenant', async () => {
    (prisma.pengumuman.findFirst as jest.Mock).mockResolvedValue({ id: PID });
    (prisma.pengumuman.update as jest.Mock).mockResolvedValue({ ...mockPengumuman, isPinned: true });

    await pengumumanService.update(TENANT_A, PID, { isPinned: true });

    expect(prisma.pengumuman.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PID } }),
    );
  });

  it('throws 404 when pengumuman not in tenant', async () => {
    (prisma.pengumuman.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      pengumumanService.update(TENANT_B, PID, { isPinned: true }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('pengumumanService.delete', () => {
  it('deletes when pengumuman belongs to tenant', async () => {
    (prisma.pengumuman.findFirst as jest.Mock).mockResolvedValue({ id: PID });
    (prisma.pengumuman.delete as jest.Mock).mockResolvedValue(undefined);

    await pengumumanService.delete(TENANT_A, PID);

    expect(prisma.pengumuman.delete).toHaveBeenCalledWith({ where: { id: PID } });
  });

  it('throws 404 when pengumuman not in tenant', async () => {
    (prisma.pengumuman.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(pengumumanService.delete(TENANT_B, PID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('pengumumanService.getAuthorId', () => {
  it('returns authorId when found in tenant', async () => {
    (prisma.pengumuman.findFirst as jest.Mock).mockResolvedValue({ authorId: AUTHOR_ID });

    const result = await pengumumanService.getAuthorId(TENANT_A, PID);

    expect(result).toBe(AUTHOR_ID);
  });

  it('returns null when not found', async () => {
    (prisma.pengumuman.findFirst as jest.Mock).mockResolvedValue(null);

    expect(await pengumumanService.getAuthorId(TENANT_B, PID)).toBeNull();
  });
});
