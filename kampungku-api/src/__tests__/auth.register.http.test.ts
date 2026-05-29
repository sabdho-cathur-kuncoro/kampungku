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

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import app from '../app';

const ACCESS_SECRET = 'test-access-secret-minimum-32-characters';
const TENANT_ID = 'tenant-uuid-test';

const adminToken = (tenantId: string | null = TENANT_ID): string =>
  jwt.sign({ sub: 'admin-uuid', role: 'ADMIN', tenantId }, ACCESS_SECRET, { expiresIn: '15m' });

const superAdminToken = (): string =>
  jwt.sign({ sub: 'super-uuid', role: 'SUPER_ADMIN', tenantId: null }, ACCESS_SECRET, {
    expiresIn: '15m',
  });

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => {
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue({ id: TENANT_ID, isActive: true });
  });

  it('201 — ADMIN registers user in own tenant', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'uuid-1',
      tenantId: TENANT_ID,
      name: 'Budi',
      email: 'budi@test.com',
      phone: '08123456789',
      role: 'WARGA',
    });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Budi', email: 'budi@test.com', password: 'Password1', phone: '08123456789' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Registrasi berhasil');
    expect(res.body.data.user.email).toBe('budi@test.com');
    expect(res.body.data.user.tenantId).toBe(TENANT_ID);
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  it('201 — SUPER_ADMIN registers via X-Tenant-Id header', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'uuid-2',
      tenantId: TENANT_ID,
      name: 'Sari',
      email: 'sari@test.com',
      phone: null,
      role: 'WARGA',
    });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${superAdminToken()}`)
      .set('X-Tenant-Id', TENANT_ID)
      .send({ name: 'Sari', email: 'sari@test.com', password: 'Password1' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.tenantId).toBe(TENANT_ID);
  });

  it('400 — SUPER_ADMIN tanpa X-Tenant-Id', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${superAdminToken()}`)
      .send({ name: 'X', email: 'x@test.com', password: 'Password1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('401 — tanpa Authorization header', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Budi', email: 'budi@test.com', password: 'Password1' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('403 — WARGA tidak boleh register user lain', async () => {
    const wargaToken = jwt.sign(
      { sub: 'warga-uuid', role: 'WARGA', tenantId: TENANT_ID },
      ACCESS_SECRET,
      { expiresIn: '15m' },
    );

    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${wargaToken}`)
      .send({ name: 'Budi', email: 'budi@test.com', password: 'Password1' });

    expect(res.status).toBe(403);
  });

  it('400 — invalid body (bad email, short password, short name)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'A', email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('400 — missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('409 — duplicate email', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Sari', email: 'taken@test.com', password: 'Password1' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email sudah terdaftar');
  });
});
