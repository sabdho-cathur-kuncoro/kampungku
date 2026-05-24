jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../config/redis', () => ({
  redis: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
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

import jwt from 'jsonwebtoken';
import request from 'supertest';
import { prisma } from '../config/database';
import app from '../app';

const ACCESS_SECRET = 'test-access-secret-minimum-32-characters';

describe('GET /api/v1/auth/me', () => {
  it('200 — returns user profile for authenticated request', async () => {
    const token = jwt.sign({ sub: 'uuid-me-1', role: 'WARGA' }, ACCESS_SECRET, { expiresIn: '15m' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'uuid-me-1',
      name: 'Budi',
      email: 'budi@test.com',
      phone: '08123456789',
      role: 'WARGA',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Data berhasil diambil');
    expect(res.body.data.email).toBe('budi@test.com');
    expect(res.body.data.id).toBe('uuid-me-1');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('401 — no Authorization header', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('401 — invalid access token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
