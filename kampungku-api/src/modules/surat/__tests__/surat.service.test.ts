jest.mock('../../../config/database', () => ({
  prisma: {
    permohonanSurat: {
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
import { suratService } from '../surat.service';

const TENANT_A = 'tenant-aaa';
const TENANT_B = 'tenant-bbb';
const USER_ID = 'user-uuid-1';
const WARGA_ID = 'warga-uuid-1';
const SURAT_ID = 'surat-uuid-1';
const APPROVER_ID = 'approver-uuid-1';

const mockSurat = {
  id: SURAT_ID,
  tenantId: TENANT_A,
  jenisSurat: 'DOMISILI' as const,
  keperluan: 'Keperluan surat domisili',
  status: 'DIAJUKAN' as const,
  noSurat: null,
  alasanTolak: null,
  tglDiajukan: new Date(),
  tglDiproses: null,
  warga: {
    id: WARGA_ID,
    nik: '1234567890123456',
    alamat: 'Jl. Merdeka No. 1',
    user: { id: USER_ID, name: 'Budi' },
  },
  approver: null,
};

const mockWarga = { id: WARGA_ID, userId: USER_ID };

describe('suratService.list', () => {
  it('filters by tenantId', async () => {
    (prisma.permohonanSurat.findMany as jest.Mock).mockResolvedValue([mockSurat]);
    (prisma.permohonanSurat.count as jest.Mock).mockResolvedValue(1);

    const result = await suratService.list(TENANT_A);

    expect(prisma.permohonanSurat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A }) }),
    );
    expect(result.data).toHaveLength(1);
  });

  it('cross-tenant isolation: tenant B query does not include tenant A data', async () => {
    (prisma.permohonanSurat.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.permohonanSurat.count as jest.Mock).mockResolvedValue(0);

    const result = await suratService.list(TENANT_B);

    expect(prisma.permohonanSurat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_B }) }),
    );
    expect(result.data).toHaveLength(0);
  });

  it('filters by status when provided', async () => {
    (prisma.permohonanSurat.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.permohonanSurat.count as jest.Mock).mockResolvedValue(0);

    await suratService.list(TENANT_A, { status: 'DISETUJUI' });

    expect(prisma.permohonanSurat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT_A, status: 'DISETUJUI' }),
      }),
    );
  });
});

describe('suratService.listSaya', () => {
  it('scopes to warga owned by userId in tenant', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(mockWarga);
    (prisma.permohonanSurat.findMany as jest.Mock).mockResolvedValue([mockSurat]);
    (prisma.permohonanSurat.count as jest.Mock).mockResolvedValue(1);

    const result = await suratService.listSaya(TENANT_A, USER_ID);

    expect(prisma.warga.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { rtId: TENANT_A, userId: USER_ID } }),
    );
    expect(prisma.permohonanSurat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT_A, wargaId: WARGA_ID }),
      }),
    );
    expect(result.data).toHaveLength(1);
  });

  it('throws 404 when warga not found in tenant', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(suratService.listSaya(TENANT_A, 'ghost')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Profil warga tidak ditemukan',
    });
  });
});

describe('suratService.getById', () => {
  it('returns surat when found in tenant', async () => {
    (prisma.permohonanSurat.findFirst as jest.Mock).mockResolvedValue(mockSurat);

    const result = await suratService.getById(TENANT_A, SURAT_ID);

    expect(prisma.permohonanSurat.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: SURAT_ID, tenantId: TENANT_A } }),
    );
    expect(result.id).toBe(SURAT_ID);
  });

  it('throws 404 when not found in tenant', async () => {
    (prisma.permohonanSurat.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(suratService.getById(TENANT_B, SURAT_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('suratService.ajukan', () => {
  it('creates surat scoped to tenant via warga lookup', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(mockWarga);
    (prisma.permohonanSurat.create as jest.Mock).mockResolvedValue(mockSurat);

    await suratService.ajukan(TENANT_A, USER_ID, {
      jenisSurat: 'DOMISILI',
      keperluan: 'Keperluan domisili untuk urusan bank',
    });

    expect(prisma.permohonanSurat.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT_A,
          wargaId: WARGA_ID,
          status: 'DIAJUKAN',
        }),
      }),
    );
  });

  it('throws 404 when warga not in tenant', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      suratService.ajukan(TENANT_A, 'unknown', { jenisSurat: 'DOMISILI', keperluan: 'test keperluan' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('suratService.approve', () => {
  it('sets status DISETUJUI and generates noSurat', async () => {
    (prisma.permohonanSurat.findFirst as jest.Mock).mockResolvedValue({ id: SURAT_ID, status: 'DIAJUKAN' });
    (prisma.permohonanSurat.count as jest.Mock).mockResolvedValue(5);
    (prisma.permohonanSurat.update as jest.Mock).mockResolvedValue({
      ...mockSurat,
      status: 'DISETUJUI',
      noSurat: `006/SURAT/${new Date().getFullYear()}`,
      approvedBy: APPROVER_ID,
    });

    const result = await suratService.approve(TENANT_A, SURAT_ID, APPROVER_ID);

    expect(prisma.permohonanSurat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DISETUJUI',
          approvedBy: APPROVER_ID,
          noSurat: expect.stringContaining('/SURAT/'),
        }),
      }),
    );
    expect(result.status).toBe('DISETUJUI');
  });

  it('throws 400 when surat not DIAJUKAN', async () => {
    (prisma.permohonanSurat.findFirst as jest.Mock).mockResolvedValue({ id: SURAT_ID, status: 'DISETUJUI' });

    await expect(suratService.approve(TENANT_A, SURAT_ID, APPROVER_ID)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('throws 404 when not in tenant', async () => {
    (prisma.permohonanSurat.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(suratService.approve(TENANT_B, SURAT_ID, APPROVER_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('suratService.tolak', () => {
  it('sets status DITOLAK with alasanTolak', async () => {
    (prisma.permohonanSurat.findFirst as jest.Mock).mockResolvedValue({ id: SURAT_ID, status: 'DIAJUKAN' });
    (prisma.permohonanSurat.update as jest.Mock).mockResolvedValue({
      ...mockSurat,
      status: 'DITOLAK',
      alasanTolak: 'Data tidak lengkap',
    });

    const result = await suratService.tolak(TENANT_A, SURAT_ID, APPROVER_ID, {
      alasanTolak: 'Data tidak lengkap',
    });

    expect(prisma.permohonanSurat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DITOLAK',
          alasanTolak: 'Data tidak lengkap',
        }),
      }),
    );
    expect(result.status).toBe('DITOLAK');
  });

  it('throws 400 when surat not DIAJUKAN', async () => {
    (prisma.permohonanSurat.findFirst as jest.Mock).mockResolvedValue({ id: SURAT_ID, status: 'DITOLAK' });

    await expect(
      suratService.tolak(TENANT_A, SURAT_ID, APPROVER_ID, { alasanTolak: 'alasan' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 when not in tenant', async () => {
    (prisma.permohonanSurat.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      suratService.tolak(TENANT_B, SURAT_ID, APPROVER_ID, { alasanTolak: 'alasan' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('suratService.getForDownload', () => {
  const approvedSurat = {
    ...mockSurat,
    status: 'DISETUJUI' as const,
    noSurat: '001/SURAT/2026',
    tglDiproses: new Date(),
    warga: { nik: '1234567890123456', alamat: 'Jl. Merdeka', user: { name: 'Budi' } },
    tenant: { nama: 'RT 01 RW 01' },
  };

  it('returns surat data when DISETUJUI', async () => {
    (prisma.permohonanSurat.findFirst as jest.Mock).mockResolvedValue(approvedSurat);

    const result = await suratService.getForDownload(TENANT_A, SURAT_ID);

    expect(result.noSurat).toBe('001/SURAT/2026');
    expect(result.status).toBe('DISETUJUI');
  });

  it('throws 400 when not DISETUJUI', async () => {
    (prisma.permohonanSurat.findFirst as jest.Mock).mockResolvedValue({ ...approvedSurat, status: 'DIAJUKAN' });

    await expect(suratService.getForDownload(TENANT_A, SURAT_ID)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Surat hanya dapat diunduh setelah disetujui',
    });
  });

  it('throws 404 when not found', async () => {
    (prisma.permohonanSurat.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(suratService.getForDownload(TENANT_B, SURAT_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('suratService.getOwnerUserId', () => {
  it('returns userId of warga who owns the surat', async () => {
    (prisma.permohonanSurat.findFirst as jest.Mock).mockResolvedValue({
      warga: { userId: USER_ID },
    });

    const result = await suratService.getOwnerUserId(TENANT_A, SURAT_ID);

    expect(result).toBe(USER_ID);
  });

  it('returns null when not found', async () => {
    (prisma.permohonanSurat.findFirst as jest.Mock).mockResolvedValue(null);

    expect(await suratService.getOwnerUserId(TENANT_B, SURAT_ID)).toBeNull();
  });
});
