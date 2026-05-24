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
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
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

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn(),
}));

import jwt from 'jsonwebtoken';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import { authService } from '../auth.service';
import bcrypt from 'bcryptjs';

const REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters';

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
    expect(redis.set).toHaveBeenCalledWith(
      'refresh:uuid-123',
      expect.any(String),
      'EX',
      604800,
    );
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
    expect(createCall.data.passwordHash).toMatch(/^\$2[ab]\$/);
  });
});

describe('authService.login', () => {
  const mockUser = {
    id: 'uuid-login-1',
    name: 'Budi',
    email: 'budi@test.com',
    phone: '08123456789',
    role: 'WARGA' as const,
    passwordHash: '$2b$12$hashedpassword',
    isActive: true,
  };

  it('returns user and tokens on valid credentials', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await authService.login({
      email: 'budi@test.com',
      password: 'Password1',
    });

    expect(result.user.email).toBe('budi@test.com');
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('isActive');
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
    expect(redis.set).toHaveBeenCalledWith(
      'refresh:uuid-login-1',
      expect.any(String),
      'EX',
      604800,
    );
  });

  it('throws AppError 401 when email not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      authService.login({ email: 'ghost@test.com', password: 'Password1' }),
    ).rejects.toMatchObject({ statusCode: 401, message: 'Email atau password salah' });
  });

  it('throws AppError 401 when password is wrong', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      authService.login({ email: 'budi@test.com', password: 'WrongPass' }),
    ).rejects.toMatchObject({ statusCode: 401, message: 'Email atau password salah' });
  });

  it('throws AppError 401 when account is inactive', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      authService.login({ email: 'budi@test.com', password: 'Password1' }),
    ).rejects.toMatchObject({ statusCode: 401, message: 'Akun tidak aktif' });
  });

  it('calls bcrypt.compare with input password and stored hash', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await authService.login({ email: 'budi@test.com', password: 'Password1' });

    expect(bcrypt.compare).toHaveBeenCalledWith('Password1', '$2b$12$hashedpassword');
  });
});

describe('authService.refresh', () => {
  it('returns new accessToken and refreshToken on valid token', async () => {
    const storedToken = jwt.sign({ sub: 'uuid-refresh-1' }, REFRESH_SECRET, { expiresIn: '7d' });
    (redis.get as jest.Mock).mockResolvedValue(storedToken);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'uuid-refresh-1', role: 'WARGA' });

    const result = await authService.refresh(storedToken);

    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
    expect(redis.set).toHaveBeenCalledWith(
      'refresh:uuid-refresh-1',
      expect.any(String),
      'EX',
      604800,
    );
  });

  it('throws AppError 401 on invalid JWT', async () => {
    await expect(authService.refresh('not-a-jwt')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Refresh token tidak valid',
    });
  });

  it('throws AppError 401 when Redis has no session', async () => {
    const token = jwt.sign({ sub: 'uuid-refresh-2' }, REFRESH_SECRET, { expiresIn: '7d' });
    (redis.get as jest.Mock).mockResolvedValue(null);

    await expect(authService.refresh(token)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Sesi tidak ditemukan',
    });
  });

  it('throws AppError 401 on token mismatch (replay attack)', async () => {
    const token = jwt.sign({ sub: 'uuid-refresh-3' }, REFRESH_SECRET, { expiresIn: '7d' });
    (redis.get as jest.Mock).mockResolvedValue('different-stored-token');

    await expect(authService.refresh(token)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Refresh token tidak valid',
    });
  });
});
