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
import app from '../app';

const REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters';

describe('POST /api/v1/auth/logout', () => {
  it('200 — valid refresh token returns success', async () => {
    const refreshToken = jwt.sign({ sub: 'uuid-1' }, REFRESH_SECRET, { expiresIn: '7d' });

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Logout berhasil');
  });

  it('400 — missing refreshToken field', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('200 — even an expired/invalid token returns success (best-effort logout)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'invalid-token-string' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
