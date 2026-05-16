jest.mock('../../../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../../../config/redis', () => ({
  redis: {
    set: jest.fn().mockResolvedValue('OK'),
  },
}));

jest.mock('../../../config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-access-secret-minimum-32-characters',
    JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-characters',
    JWT_ACCESS_EXPIRES: '15m',
    JWT_REFRESH_EXPIRES: '7d',
  },
}));

import { prisma } from '../../../config/database';
import { authService } from '../auth.service';

describe('authService.register', () => {
  it('creates user and returns tokens', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'uuid-123',
      name: 'Budi',
      email: 'budi@test.com',
      phone: '08123456789',
      role: 'WARGA',
    });

    const result = await authService.register({
      name: 'Budi',
      email: 'budi@test.com',
      password: 'Password1',
      phone: '08123456789',
    });

    expect(result.user.email).toBe('budi@test.com');
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
  });

  it('throws AppError 409 when email already registered', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

    await expect(
      authService.register({
        name: 'Another',
        email: 'existing@test.com',
        password: 'Password1',
      }),
    ).rejects.toMatchObject({ statusCode: 409, message: 'Email sudah terdaftar' });
  });

  it('bcrypt hashes password before saving', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'uuid-456',
      name: 'Sari',
      email: 'sari@test.com',
      phone: null,
      role: 'WARGA',
    });

    await authService.register({ name: 'Sari', email: 'sari@test.com', password: 'Password1' });

    const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.passwordHash).toBeDefined();
    expect(createCall.data.passwordHash).not.toBe('Password1');
  });
});
