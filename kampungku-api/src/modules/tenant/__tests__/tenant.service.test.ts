jest.mock('../../../config/database', () => ({
  prisma: {
    rT: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../../config/redis', () => ({
  redis: {
    del: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
}));

import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import { tenantService } from '../tenant.service';
import { tenantActiveCacheKey } from '../../../middlewares/tenant.middleware';

const validCreateInput = {
  nama: 'RT 05 RW 02 Sukamaju',
  slug: 'rt05-rw02-sukamaju',
  nomorRt: '05',
  nomorRw: '02',
  kelurahan: 'Sukamaju',
  kecamatan: 'Cibinong',
  admin: {
    name: 'Admin Sukamaju',
    email: 'admin.sukamaju@kampungku.id',
    phone: '081200000050',
    password: 'Password1',
  },
};

describe('tenantService.list', () => {
  it('returns tenants ordered by createdAt desc', async () => {
    (prisma.rT.findMany as jest.Mock).mockResolvedValue([{ id: 't1' }, { id: 't2' }]);

    const result = await tenantService.list();

    expect(result).toHaveLength(2);
    expect(prisma.rT.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });
});

describe('tenantService.getById', () => {
  it('returns tenant when found', async () => {
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue({ id: 't1', nama: 'X' });

    const result = await tenantService.getById('t1');

    expect(result).toEqual({ id: 't1', nama: 'X' });
  });

  it('throws 404 when not found', async () => {
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(tenantService.getById('missing')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Tenant tidak ditemukan',
    });
  });
});

describe('tenantService.create', () => {
  it('creates tenant + admin in transaction', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const txMock = {
      rT: { create: jest.fn().mockResolvedValue({ id: 'new-tenant', slug: validCreateInput.slug }) },
      user: {
        create: jest.fn().mockResolvedValue({
          id: 'admin-uuid',
          tenantId: 'new-tenant',
          name: validCreateInput.admin.name,
          email: validCreateInput.admin.email,
          phone: validCreateInput.admin.phone,
          role: 'ADMIN',
        }),
      },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(txMock));

    const result = await tenantService.create(validCreateInput);

    expect(txMock.rT.create).toHaveBeenCalled();
    expect(txMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'new-tenant',
          email: validCreateInput.admin.email,
          role: 'ADMIN',
        }),
      }),
    );
    expect(result.tenant.id).toBe('new-tenant');
    expect(result.admin.role).toBe('ADMIN');
  });

  it('rejects if admin email already exists (pre-check)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });

    await expect(tenantService.create(validCreateInput)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Email admin sudah terdaftar',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('maps slug unique violation to 409', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const dupErr = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '5.0.0',
      meta: { target: ['slug'] },
    });
    (prisma.$transaction as jest.Mock).mockRejectedValue(dupErr);

    await expect(tenantService.create(validCreateInput)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Slug tenant sudah digunakan',
    });
  });
});

describe('tenantService.update', () => {
  it('updates only provided fields', async () => {
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue({ id: 't1' });
    (prisma.rT.update as jest.Mock).mockResolvedValue({ id: 't1', nama: 'New Name' });

    const result = await tenantService.update('t1', { nama: 'New Name' });

    expect(prisma.rT.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't1' },
        data: { nama: 'New Name' },
      }),
    );
    expect(result.nama).toBe('New Name');
  });

  it('404 when tenant not found', async () => {
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(tenantService.update('missing', { nama: 'X' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('tenantService.setActive', () => {
  beforeEach(() => {
    (redis.del as jest.Mock).mockClear();
  });

  it('activates tenant and invalidates active-flag cache', async () => {
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue({ id: 't1' });
    (prisma.rT.update as jest.Mock).mockResolvedValue({ id: 't1', isActive: true });

    const result = await tenantService.setActive('t1', true);

    expect(result.isActive).toBe(true);
    expect(prisma.rT.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: true } }),
    );
    expect(redis.del).toHaveBeenCalledWith(tenantActiveCacheKey('t1'));
  });

  it('deactivates tenant and invalidates cache', async () => {
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue({ id: 't1' });
    (prisma.rT.update as jest.Mock).mockResolvedValue({ id: 't1', isActive: false });

    const result = await tenantService.setActive('t1', false);

    expect(result.isActive).toBe(false);
    expect(redis.del).toHaveBeenCalledWith(tenantActiveCacheKey('t1'));
  });
});

describe('tenantService.listUsers', () => {
  it('lists all users when no tenantId filter', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);

    await tenantService.listUsers();

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it('filters by tenantId when provided', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    await tenantService.listUsers('tenant-1');

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
    );
  });
});
