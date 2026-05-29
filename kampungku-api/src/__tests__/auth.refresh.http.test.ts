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
import { redis } from '../config/redis';
import app from '../app';

const REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters';

describe('POST /api/v1/auth/refresh', () => {
  it('200 — valid refresh token returns new access and refresh tokens', async () => {
    const refreshToken = jwt.sign({ sub: 'uuid-1', tenantId: 'tenant-1' }, REFRESH_SECRET, {
      expiresIn: '7d',
    });
    (redis.get as jest.Mock).mockResolvedValue(refreshToken);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'uuid-1',
      role: 'WARGA',
      tenantId: 'tenant-1',
    });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Token diperbarui');
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  it('400 — missing refreshToken field', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('401 — invalid JWT string', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'not-a-jwt' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Refresh token tidak valid');
  });

  it('401 — Redis has no session', async () => {
    const refreshToken = jwt.sign({ sub: 'uuid-2' }, REFRESH_SECRET, { expiresIn: '7d' });
    (redis.get as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Sesi tidak ditemukan');
  });
});
