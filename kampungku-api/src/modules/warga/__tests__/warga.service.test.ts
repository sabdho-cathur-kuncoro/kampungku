jest.mock('../../../config/database', () => ({
  prisma: {
    warga: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    anggotaKeluarga: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashed'),
}));

import { prisma } from '../../../config/database';
import { wargaService } from '../warga.service';

const TENANT_ID = 'tenant-abc';
const WARGA_ID = 'warga-uuid-1';
const USER_ID = 'user-uuid-1';

const mockWarga = {
  id: WARGA_ID,
  nik: '1234567890123456',
  noKk: '1234567890123456',
  alamat: 'Jl. Merdeka No. 1',
  rtId: TENANT_ID,
  statusTinggal: 'TETAP',
  tglMasuk: null,
  fotoProfilUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: USER_ID, name: 'Budi', email: 'budi@example.com', phone: null, role: 'WARGA', isActive: true },
};

const validCreateInput = {
  name: 'Budi Santoso',
  email: 'budi@example.com',
  phone: '08123456789',
  password: 'Password1',
  nik: '1234567890123456',
  noKk: '9876543210987654',
  alamat: 'Jl. Merdeka No. 1 RT 01',
  statusTinggal: 'TETAP' as const,
};

describe('wargaService.list', () => {
  it('returns paginated data with meta', async () => {
    (prisma.warga.findMany as jest.Mock).mockResolvedValue([mockWarga]);
    (prisma.warga.count as jest.Mock).mockResolvedValue(1);

    const result = await wargaService.list(TENANT_ID, { page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    expect(prisma.warga.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ rtId: TENANT_ID }) }),
    );
  });

  it('applies search filter to name, nik, alamat', async () => {
    (prisma.warga.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.warga.count as jest.Mock).mockResolvedValue(0);

    await wargaService.list(TENANT_ID, { search: 'budi' });

    expect(prisma.warga.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      }),
    );
  });

  it('applies statusTinggal filter', async () => {
    (prisma.warga.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.warga.count as jest.Mock).mockResolvedValue(0);

    await wargaService.list(TENANT_ID, { status: 'KONTRAK' });

    expect(prisma.warga.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ statusTinggal: 'KONTRAK' }),
      }),
    );
  });
});

describe('wargaService.getById', () => {
  it('returns warga when found', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(mockWarga);

    const result = await wargaService.getById(TENANT_ID, WARGA_ID);

    expect(result.id).toBe(WARGA_ID);
    expect(prisma.warga.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: WARGA_ID, rtId: TENANT_ID } }),
    );
  });

  it('throws 404 when not found', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(wargaService.getById(TENANT_ID, 'missing')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Warga tidak ditemukan',
    });
  });
});

describe('wargaService.create', () => {
  it('creates user + warga in transaction', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    const txMock = {
      user: { create: jest.fn().mockResolvedValue({ id: USER_ID }) },
      warga: { create: jest.fn().mockResolvedValue(mockWarga) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(txMock));

    const result = await wargaService.create(TENANT_ID, validCreateInput);

    expect(txMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: TENANT_ID, role: 'WARGA' }),
      }),
    );
    expect(txMock.warga.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: USER_ID, rtId: TENANT_ID }),
      }),
    );
    expect(result).toEqual(mockWarga);
  });

  it('rejects with 409 if email already exists', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

    await expect(wargaService.create(TENANT_ID, validCreateInput)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Email sudah terdaftar',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects with 409 if NIK already exists in tenant', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

    await expect(wargaService.create(TENANT_ID, validCreateInput)).rejects.toMatchObject({
      statusCode: 409,
      message: 'NIK sudah terdaftar di RT ini',
    });
  });
});

describe('wargaService.update', () => {
  it('updates warga and user fields in transaction', async () => {
    (prisma.warga.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: WARGA_ID, userId: USER_ID, nik: '1111111111111111' })
      .mockResolvedValue(null);

    const txMock = {
      user: { update: jest.fn() },
      warga: { update: jest.fn().mockResolvedValue({ ...mockWarga, alamat: 'Jl. Baru' }) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(txMock));

    const result = await wargaService.update(TENANT_ID, WARGA_ID, {
      name: 'Budi Baru',
      alamat: 'Jl. Baru',
    });

    expect(txMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: USER_ID }, data: expect.objectContaining({ name: 'Budi Baru' }) }),
    );
    expect(txMock.warga.update).toHaveBeenCalled();
    expect(result.alamat).toBe('Jl. Baru');
  });

  it('throws 404 when warga not found', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(wargaService.update(TENANT_ID, 'missing', { alamat: 'X' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 409 on NIK conflict within tenant', async () => {
    (prisma.warga.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: WARGA_ID, userId: USER_ID, nik: '0000000000000000' })
      .mockResolvedValueOnce({ id: 'other-warga' });

    await expect(
      wargaService.update(TENANT_ID, WARGA_ID, { nik: '1234567890123456' }),
    ).rejects.toMatchObject({ statusCode: 409, message: 'NIK sudah terdaftar di RT ini' });
  });
});

describe('wargaService.delete', () => {
  it('deletes warga then user in transaction', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID, userId: USER_ID });

    const txMock = {
      warga: { delete: jest.fn() },
      user: { delete: jest.fn() },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(txMock));

    await wargaService.delete(TENANT_ID, WARGA_ID);

    expect(txMock.warga.delete).toHaveBeenCalledWith({ where: { id: WARGA_ID } });
    expect(txMock.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
  });

  it('throws 404 when not found', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(wargaService.delete(TENANT_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('wargaService.getOwnerUserId', () => {
  it('returns userId when warga exists in tenant', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ userId: USER_ID });

    const result = await wargaService.getOwnerUserId(TENANT_ID, WARGA_ID);

    expect(result).toBe(USER_ID);
  });

  it('returns null when warga not found or wrong tenant', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await wargaService.getOwnerUserId(TENANT_ID, 'wrong');

    expect(result).toBeNull();
  });
});

describe('wargaService.listKeluarga', () => {
  it('returns keluarga list when warga found', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.anggotaKeluarga.findMany as jest.Mock).mockResolvedValue([{ id: 'k1' }]);

    const result = await wargaService.listKeluarga(TENANT_ID, WARGA_ID);

    expect(result).toHaveLength(1);
    expect(prisma.anggotaKeluarga.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { wargaId: WARGA_ID } }),
    );
  });

  it('throws 404 when warga not found', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(wargaService.listKeluarga(TENANT_ID, 'missing')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('wargaService.addKeluarga', () => {
  const keluargaInput = {
    nama: 'Siti',
    nik: '9876543210987654',
    hubungan: 'Istri',
    tglLahir: '1990-01-01',
    jenisKelamin: 'P' as const,
  };

  it('creates anggota keluarga', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.anggotaKeluarga.create as jest.Mock).mockResolvedValue({ id: 'k1', ...keluargaInput });

    const result = await wargaService.addKeluarga(TENANT_ID, WARGA_ID, keluargaInput);

    expect(prisma.anggotaKeluarga.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ wargaId: WARGA_ID }) }),
    );
    expect(result.id).toBe('k1');
  });

  it('throws 404 when warga not in tenant', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(wargaService.addKeluarga(TENANT_ID, 'missing', keluargaInput)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('wargaService.updateKeluarga', () => {
  it('updates keluarga when found', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.anggotaKeluarga.findFirst as jest.Mock).mockResolvedValue({ id: 'k1', wargaId: WARGA_ID });
    (prisma.anggotaKeluarga.update as jest.Mock).mockResolvedValue({ id: 'k1', nama: 'Siti Baru' });

    const result = await wargaService.updateKeluarga(TENANT_ID, WARGA_ID, 'k1', { nama: 'Siti Baru' });

    expect(result.nama).toBe('Siti Baru');
  });

  it('throws 404 when keluarga not found', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.anggotaKeluarga.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      wargaService.updateKeluarga(TENANT_ID, WARGA_ID, 'missing', { nama: 'X' }),
    ).rejects.toMatchObject({ statusCode: 404, message: 'Anggota keluarga tidak ditemukan' });
  });
});

describe('wargaService.deleteKeluarga', () => {
  it('deletes keluarga', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.anggotaKeluarga.findFirst as jest.Mock).mockResolvedValue({ id: 'k1' });
    (prisma.anggotaKeluarga.delete as jest.Mock).mockResolvedValue({});

    await wargaService.deleteKeluarga(TENANT_ID, WARGA_ID, 'k1');

    expect(prisma.anggotaKeluarga.delete).toHaveBeenCalledWith({ where: { id: 'k1' } });
  });

  it('throws 404 when keluarga not found', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.anggotaKeluarga.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      wargaService.deleteKeluarga(TENANT_ID, WARGA_ID, 'missing'),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
