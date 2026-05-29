jest.mock('../config/database', () => ({
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

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import app from '../app';

const ACCESS_SECRET = 'test-access-secret-minimum-32-characters';
const VALID_UUID = '11111111-1111-4111-8111-111111111111';

const superToken = (): string =>
  jwt.sign({ sub: 'super-uuid', role: 'SUPER_ADMIN', tenantId: null }, ACCESS_SECRET, {
    expiresIn: '15m',
  });

const adminToken = (): string =>
  jwt.sign({ sub: 'admin-uuid', role: 'ADMIN', tenantId: 'tenant-x' }, ACCESS_SECRET, {
    expiresIn: '15m',
  });

const baseTenantBody = {
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

describe('GET /api/v1/admin/tenants', () => {
  it('200 — SUPER_ADMIN lists tenants', async () => {
    (prisma.rT.findMany as jest.Mock).mockResolvedValue([
      { id: 't1', nama: 'A' },
      { id: 't2', nama: 'B' },
    ]);

    const res = await request(app)
      .get('/api/v1/admin/tenants')
      .set('Authorization', `Bearer ${superToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('401 — no Authorization header', async () => {
    const res = await request(app).get('/api/v1/admin/tenants');
    expect(res.status).toBe(401);
  });

  it('403 — ADMIN role is not allowed', async () => {
    const res = await request(app)
      .get('/api/v1/admin/tenants')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/v1/admin/tenants', () => {
  it('201 — creates tenant + admin', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const txMock = {
      rT: { create: jest.fn().mockResolvedValue({ id: 'new-tenant-id', slug: baseTenantBody.slug }) },
      user: {
        create: jest.fn().mockResolvedValue({
          id: 'admin-uuid',
          tenantId: 'new-tenant-id',
          name: baseTenantBody.admin.name,
          email: baseTenantBody.admin.email,
          phone: baseTenantBody.admin.phone,
          role: 'ADMIN',
        }),
      },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(txMock));

    const res = await request(app)
      .post('/api/v1/admin/tenants')
      .set('Authorization', `Bearer ${superToken()}`)
      .send(baseTenantBody);

    expect(res.status).toBe(201);
    expect(res.body.data.tenant.id).toBe('new-tenant-id');
    expect(res.body.data.admin.role).toBe('ADMIN');
    expect(res.body.data.admin).not.toHaveProperty('passwordHash');
  });

  it('400 — invalid slug format', async () => {
    const res = await request(app)
      .post('/api/v1/admin/tenants')
      .set('Authorization', `Bearer ${superToken()}`)
      .send({ ...baseTenantBody, slug: 'Invalid Slug!' });

    expect(res.status).toBe(400);
  });

  it('400 — missing admin object', async () => {
    const { admin: _admin, ...withoutAdmin } = baseTenantBody;
    const res = await request(app)
      .post('/api/v1/admin/tenants')
      .set('Authorization', `Bearer ${superToken()}`)
      .send(withoutAdmin);

    expect(res.status).toBe(400);
  });

  it('409 — admin email already exists', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

    const res = await request(app)
      .post('/api/v1/admin/tenants')
      .set('Authorization', `Bearer ${superToken()}`)
      .send(baseTenantBody);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Email admin sudah terdaftar');
  });

  it('403 — ADMIN cannot create tenants', async () => {
    const res = await request(app)
      .post('/api/v1/admin/tenants')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(baseTenantBody);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/admin/tenants/:id', () => {
  it('200 — returns tenant', async () => {
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue({ id: VALID_UUID, nama: 'X' });

    const res = await request(app)
      .get(`/api/v1/admin/tenants/${VALID_UUID}`)
      .set('Authorization', `Bearer ${superToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(VALID_UUID);
  });

  it('400 — invalid UUID', async () => {
    const res = await request(app)
      .get('/api/v1/admin/tenants/not-a-uuid')
      .set('Authorization', `Bearer ${superToken()}`);

    expect(res.status).toBe(400);
  });

  it('404 — tenant not found', async () => {
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/v1/admin/tenants/${VALID_UUID}`)
      .set('Authorization', `Bearer ${superToken()}`);

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/v1/admin/tenants/:id', () => {
  it('200 — updates fields', async () => {
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue({ id: VALID_UUID });
    (prisma.rT.update as jest.Mock).mockResolvedValue({ id: VALID_UUID, nama: 'Renamed' });

    const res = await request(app)
      .put(`/api/v1/admin/tenants/${VALID_UUID}`)
      .set('Authorization', `Bearer ${superToken()}`)
      .send({ nama: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.data.nama).toBe('Renamed');
  });

  it('400 — empty body rejected', async () => {
    const res = await request(app)
      .put(`/api/v1/admin/tenants/${VALID_UUID}`)
      .set('Authorization', `Bearer ${superToken()}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/v1/admin/tenants/:id/activate & /deactivate', () => {
  it('200 — activate', async () => {
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue({ id: VALID_UUID });
    (prisma.rT.update as jest.Mock).mockResolvedValue({ id: VALID_UUID, isActive: true });

    const res = await request(app)
      .put(`/api/v1/admin/tenants/${VALID_UUID}/activate`)
      .set('Authorization', `Bearer ${superToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(true);
  });

  it('200 — deactivate', async () => {
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue({ id: VALID_UUID });
    (prisma.rT.update as jest.Mock).mockResolvedValue({ id: VALID_UUID, isActive: false });

    const res = await request(app)
      .put(`/api/v1/admin/tenants/${VALID_UUID}/deactivate`)
      .set('Authorization', `Bearer ${superToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });
});

describe('GET /api/v1/admin/users', () => {
  it('200 — lists all users when no filter', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'u1', tenantId: 't1' },
      { id: 'u2', tenantId: 't2' },
    ]);

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${superToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('200 — filters by tenantId query', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'u1', tenantId: VALID_UUID }]);

    const res = await request(app)
      .get(`/api/v1/admin/users?tenantId=${VALID_UUID}`)
      .set('Authorization', `Bearer ${superToken()}`);

    expect(res.status).toBe(200);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: VALID_UUID } }),
    );
  });

  it('400 — invalid tenantId UUID', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?tenantId=not-a-uuid')
      .set('Authorization', `Bearer ${superToken()}`);

    expect(res.status).toBe(400);
  });
});
