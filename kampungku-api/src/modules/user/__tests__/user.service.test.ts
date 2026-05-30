jest.mock('../../../config/database', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../config/database';
import { userService } from '../user.service';

const TENANT_A = 'tenant-aaa';
const TENANT_B = 'tenant-bbb';
const USER_ID = 'user-uuid-1';
const ADMIN_ID = 'admin-uuid-1';

const mockUser = {
  id: USER_ID,
  tenantId: TENANT_A,
  name: 'Budi Santoso',
  email: 'budi@kampungku.id',
  phone: '081234567890',
  role: 'WARGA' as const,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('userService.list', () => {
  it('filters by tenantId', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);

    const result = await userService.list(TENANT_A);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A }) }),
    );
    expect(result.data).toHaveLength(1);
  });

  it('cross-tenant isolation: tenant B query scoped to TENANT_B', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);

    await userService.list(TENANT_B);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_B }) }),
    );
  });

  it('filters by role when provided', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);

    await userService.list(TENANT_A, { role: 'BENDAHARA' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT_A, role: 'BENDAHARA' }),
      }),
    );
  });

  it('filters by isActive when provided', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);

    await userService.list(TENANT_A, { isActive: false });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: false }),
      }),
    );
  });
});

describe('userService.getById', () => {
  it('returns user when found in tenant', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

    const result = await userService.getById(TENANT_A, USER_ID);

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: USER_ID, tenantId: TENANT_A } }),
    );
    expect(result.id).toBe(USER_ID);
  });

  it('throws 404 when not found in tenant', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(userService.getById(TENANT_B, USER_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: 'User tidak ditemukan',
    });
  });
});

describe('userService.create', () => {
  it('creates user scoped to tenantId with hashed password', async () => {
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

    await userService.create(TENANT_A, {
      name: 'Budi Santoso',
      email: 'budi@kampungku.id',
      password: 'Warga1234!',
      role: 'WARGA',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('Warga1234!', 12);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT_A,
          passwordHash: 'hashed-password',
          role: 'WARGA',
        }),
      }),
    );
  });

  it('maps P2002 email conflict to 409', async () => {
    const dupErr = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: '5.0.0',
      meta: { target: ['email'] },
    });
    (prisma.user.create as jest.Mock).mockRejectedValue(dupErr);

    await expect(
      userService.create(TENANT_A, { name: 'X', email: 'dup@x.id', password: 'Pass1234!', role: 'WARGA' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('userService.updateProfile', () => {
  it('updates name and phone', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: USER_ID });
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, name: 'Budi Baru' });

    const result = await userService.updateProfile(TENANT_A, USER_ID, { name: 'Budi Baru' });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: USER_ID }, data: { name: 'Budi Baru' } }),
    );
    expect(result.name).toBe('Budi Baru');
  });

  it('throws 404 when not in tenant', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      userService.updateProfile(TENANT_B, USER_ID, { name: 'X' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('userService.changeRole', () => {
  it('changes role', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: USER_ID, role: 'WARGA' });
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, role: 'SEKRETARIS' });

    const result = await userService.changeRole(TENANT_A, USER_ID, { role: 'SEKRETARIS' });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: 'SEKRETARIS' } }),
    );
    expect(result.role).toBe('SEKRETARIS');
  });

  it('throws 404 when not in tenant', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      userService.changeRole(TENANT_B, USER_ID, { role: 'WARGA' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('userService.changePassword', () => {
  it('self-change verifies old password', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: USER_ID, passwordHash: 'old-hash' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (prisma.user.update as jest.Mock).mockResolvedValue(undefined);

    await userService.changePassword(
      TENANT_A, USER_ID, { oldPassword: 'OldPass1!', newPassword: 'NewPass1!' },
      USER_ID, 'WARGA',
    );

    expect(bcrypt.compare).toHaveBeenCalledWith('OldPass1!', 'old-hash');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: 'hashed-password' } }),
    );
  });

  it('self-change throws 400 when old password missing', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: USER_ID, passwordHash: 'h' });

    await expect(
      userService.changePassword(TENANT_A, USER_ID, { newPassword: 'NewPass1!' }, USER_ID, 'WARGA'),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Password lama diperlukan' });
  });

  it('self-change throws 400 when old password wrong', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: USER_ID, passwordHash: 'h' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      userService.changePassword(TENANT_A, USER_ID, { oldPassword: 'wrong', newPassword: 'NewPass1!' }, USER_ID, 'WARGA'),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('ADMIN can reset without old password', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: USER_ID, passwordHash: 'h' });
    (prisma.user.update as jest.Mock).mockResolvedValue(undefined);

    await userService.changePassword(
      TENANT_A, USER_ID, { newPassword: 'NewPass1!' }, ADMIN_ID, 'ADMIN',
    );

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('non-admin non-self throws 403', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: USER_ID, passwordHash: 'h' });

    await expect(
      userService.changePassword(TENANT_A, USER_ID, { newPassword: 'NewPass1!' }, 'other-id', 'WARGA'),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('userService.setActive', () => {
  it('activates user', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: USER_ID });
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, isActive: true });

    await userService.setActive(TENANT_A, USER_ID, true);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: true } }),
    );
  });

  it('throws 404 when not in tenant', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(userService.setActive(TENANT_B, USER_ID, false)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('userService.delete', () => {
  it('deletes user when not self', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: USER_ID });
    (prisma.user.delete as jest.Mock).mockResolvedValue(undefined);

    await userService.delete(TENANT_A, USER_ID, ADMIN_ID);

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
  });

  it('throws 400 when deleting self', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: USER_ID });

    await expect(userService.delete(TENANT_A, USER_ID, USER_ID)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Tidak dapat menghapus akun sendiri',
    });
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('throws 404 when not in tenant', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(userService.delete(TENANT_B, USER_ID, ADMIN_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
