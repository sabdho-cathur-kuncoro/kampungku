jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    rT: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../config/redis', () => ({
  redis: {
    set: jest.fn().mockResolvedValue('OK'),
  },
}));

jest.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
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

import request from 'supertest';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import app from '../app';

const TENANT_ID = 'tenant-login-http-1';
const mockUser = {
  id: 'uuid-login-http-1',
  tenantId: TENANT_ID,
  name: 'Budi',
  email: 'budi@test.com',
  phone: '08123456789',
  role: 'WARGA',
  passwordHash: '$2b$12$hashedpassword',
  isActive: true,
};

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => {
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue({ id: TENANT_ID, isActive: true });
  });

  it('200 — valid credentials returns user + tokens', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'budi@test.com', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Login berhasil');
    expect(res.body.data.user.email).toBe('budi@test.com');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.user).not.toHaveProperty('isActive');
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  it('400 — missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('400 — invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'Password1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('401 — email not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@test.com', password: 'Password1' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email atau password salah');
  });

  it('401 — wrong password', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'budi@test.com', password: 'WrongPass' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email atau password salah');
  });

  it('401 — inactive account', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'budi@test.com', password: 'Password1' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Akun tidak aktif');
  });
});
