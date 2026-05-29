jest.mock('../config/database', () => ({
  prisma: {
    warga: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    anggotaKeluarga: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../config/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue('1'), // tenant active by default
    set: jest.fn().mockResolvedValue('OK'),
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
  hash: jest.fn().mockResolvedValue('$2b$12$hashed'),
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import app from '../app';

const SECRET = 'test-access-secret-minimum-32-characters';
const TENANT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const WARGA_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const KID_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const VALID_UUID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const makeToken = (sub: string, role: string, tenantId: string | null) =>
  jwt.sign({ sub, role, tenantId }, SECRET, { expiresIn: '15m' });

const adminToken = () => makeToken('admin-user', 'ADMIN', TENANT_ID);
const ketuaRtToken = () => makeToken('ketua-user', 'KETUA_RT', TENANT_ID);
const bendaharaToken = () => makeToken('bendahara-user', 'BENDAHARA', TENANT_ID);
const wargaOwnToken = () => makeToken(USER_ID, 'WARGA', TENANT_ID);
const wargaOtherToken = () => makeToken('other-warga-user', 'WARGA', TENANT_ID);

const mockWargaRow = {
  id: WARGA_ID,
  nik: '1234567890123456',
  noKk: '9876543210987654',
  alamat: 'Jl. Merdeka No. 1',
  rtId: TENANT_ID,
  statusTinggal: 'TETAP',
  tglMasuk: null,
  fotoProfilUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  user: { id: USER_ID, name: 'Budi', email: 'budi@example.com', phone: null, role: 'WARGA', isActive: true },
};

const validCreateBody = {
  name: 'Budi Santoso',
  email: 'budi.new@example.com',
  phone: '08123456789',
  password: 'Password1',
  nik: '1234567890123456',
  noKk: '9876543210987654',
  alamat: 'Jl. Merdeka No. 1 RT 01',
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: tenant is active
  const { redis } = jest.requireMock('../config/redis');
  redis.get.mockResolvedValue('1');
});

// --- GET /api/v1/warga ---

describe('GET /api/v1/warga', () => {
  it('200 — ADMIN gets list with meta', async () => {
    (prisma.warga.findMany as jest.Mock).mockResolvedValue([mockWargaRow]);
    (prisma.warga.count as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/v1/warga')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 1, total: 1 });
  });

  it('200 — BENDAHARA can list warga', async () => {
    (prisma.warga.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.warga.count as jest.Mock).mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/warga')
      .set('Authorization', `Bearer ${bendaharaToken()}`);

    expect(res.status).toBe(200);
  });

  it('403 — WARGA cannot list all warga', async () => {
    const res = await request(app)
      .get('/api/v1/warga')
      .set('Authorization', `Bearer ${wargaOwnToken()}`);

    expect(res.status).toBe(403);
  });

  it('401 — no Authorization header', async () => {
    const res = await request(app).get('/api/v1/warga');
    expect(res.status).toBe(401);
  });
});

// --- GET /api/v1/warga/:id ---

describe('GET /api/v1/warga/:id', () => {
  it('200 — ADMIN gets specific warga', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(mockWargaRow);

    const res = await request(app)
      .get(`/api/v1/warga/${WARGA_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(WARGA_ID);
  });

  it('200 — WARGA can view own profile (ownership match)', async () => {
    // getOwnerUserId lookup → returns USER_ID which matches wargaOwnToken sub
    (prisma.warga.findFirst as jest.Mock)
      .mockResolvedValueOnce({ userId: USER_ID }) // getOwnerUserId call
      .mockResolvedValueOnce(mockWargaRow); // getById call

    const res = await request(app)
      .get(`/api/v1/warga/${WARGA_ID}`)
      .set('Authorization', `Bearer ${wargaOwnToken()}`);

    expect(res.status).toBe(200);
  });

  it("403 — WARGA cannot view another warga's profile", async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ userId: 'someone-else' });

    const res = await request(app)
      .get(`/api/v1/warga/${WARGA_ID}`)
      .set('Authorization', `Bearer ${wargaOtherToken()}`);

    expect(res.status).toBe(403);
  });

  it('400 — invalid UUID param', async () => {
    const res = await request(app)
      .get('/api/v1/warga/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(400);
  });

  it('404 — warga not found', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/v1/warga/${VALID_UUID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });
});

// --- POST /api/v1/warga ---

describe('POST /api/v1/warga', () => {
  it('201 — ADMIN creates warga', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    const txMock = {
      user: { create: jest.fn().mockResolvedValue({ id: USER_ID }) },
      warga: { create: jest.fn().mockResolvedValue(mockWargaRow) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(txMock));

    const res = await request(app)
      .post('/api/v1/warga')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validCreateBody);

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(WARGA_ID);
  });

  it('201 — KETUA_RT creates warga', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    const txMock = {
      user: { create: jest.fn().mockResolvedValue({ id: USER_ID }) },
      warga: { create: jest.fn().mockResolvedValue(mockWargaRow) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(txMock));

    const res = await request(app)
      .post('/api/v1/warga')
      .set('Authorization', `Bearer ${ketuaRtToken()}`)
      .send(validCreateBody);

    expect(res.status).toBe(201);
  });

  it('403 — BENDAHARA cannot create warga', async () => {
    const res = await request(app)
      .post('/api/v1/warga')
      .set('Authorization', `Bearer ${bendaharaToken()}`)
      .send(validCreateBody);

    expect(res.status).toBe(403);
  });

  it('400 — invalid NIK (not 16 digits)', async () => {
    const res = await request(app)
      .post('/api/v1/warga')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...validCreateBody, nik: '12345' });

    expect(res.status).toBe(400);
  });

  it('409 — duplicate email', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

    const res = await request(app)
      .post('/api/v1/warga')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validCreateBody);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Email sudah terdaftar');
  });
});

// --- PUT /api/v1/warga/:id ---

describe('PUT /api/v1/warga/:id', () => {
  it('200 — ADMIN updates warga', async () => {
    (prisma.warga.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: WARGA_ID, userId: USER_ID, nik: '1111111111111111' })
      .mockResolvedValue(null);

    const txMock = {
      user: { update: jest.fn() },
      warga: { update: jest.fn().mockResolvedValue({ ...mockWargaRow, alamat: 'Jl. Baru' }) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(txMock));

    const res = await request(app)
      .put(`/api/v1/warga/${WARGA_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ alamat: 'Jl. Baru' });

    expect(res.status).toBe(200);
  });

  it('200 — WARGA updates own profile', async () => {
    // First call: getOwnerUserId (authorize check), then findFirst (update existence check), then nikConflict check
    (prisma.warga.findFirst as jest.Mock)
      .mockResolvedValueOnce({ userId: USER_ID }) // getOwnerUserId
      .mockResolvedValueOnce({ id: WARGA_ID, userId: USER_ID, nik: mockWargaRow.nik }) // update existence check
      .mockResolvedValue(null); // nik conflict check

    const txMock = {
      user: { update: jest.fn() },
      warga: { update: jest.fn().mockResolvedValue(mockWargaRow) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(txMock));

    const res = await request(app)
      .put(`/api/v1/warga/${WARGA_ID}`)
      .set('Authorization', `Bearer ${wargaOwnToken()}`)
      .send({ alamat: 'Jl. Baru' });

    expect(res.status).toBe(200);
  });

  it("403 — WARGA cannot update other's profile", async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ userId: 'someone-else' });

    const res = await request(app)
      .put(`/api/v1/warga/${WARGA_ID}`)
      .set('Authorization', `Bearer ${wargaOtherToken()}`)
      .send({ alamat: 'Jl. Baru' });

    expect(res.status).toBe(403);
  });

  it('400 — empty body rejected', async () => {
    const res = await request(app)
      .put(`/api/v1/warga/${WARGA_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// --- DELETE /api/v1/warga/:id ---

describe('DELETE /api/v1/warga/:id', () => {
  it('200 — ADMIN deletes warga', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID, userId: USER_ID });

    const txMock = {
      warga: { delete: jest.fn() },
      user: { delete: jest.fn() },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(txMock));

    const res = await request(app)
      .delete(`/api/v1/warga/${WARGA_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
  });

  it('403 — KETUA_RT cannot delete warga', async () => {
    const res = await request(app)
      .delete(`/api/v1/warga/${WARGA_ID}`)
      .set('Authorization', `Bearer ${ketuaRtToken()}`);

    expect(res.status).toBe(403);
  });

  it('404 — warga not found', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .delete(`/api/v1/warga/${VALID_UUID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });
});

// --- GET /api/v1/warga/:id/keluarga ---

describe('GET /api/v1/warga/:id/keluarga', () => {
  it('200 — ADMIN gets keluarga list', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.anggotaKeluarga.findMany as jest.Mock).mockResolvedValue([{ id: KID_ID }]);

    const res = await request(app)
      .get(`/api/v1/warga/${WARGA_ID}/keluarga`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('200 — WARGA gets own keluarga', async () => {
    (prisma.warga.findFirst as jest.Mock)
      .mockResolvedValueOnce({ userId: USER_ID }) // getOwnerUserId
      .mockResolvedValueOnce({ id: WARGA_ID }); // listKeluarga existence check

    (prisma.anggotaKeluarga.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/v1/warga/${WARGA_ID}/keluarga`)
      .set('Authorization', `Bearer ${wargaOwnToken()}`);

    expect(res.status).toBe(200);
  });

  it("403 — WARGA cannot get other's keluarga", async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ userId: 'someone-else' });

    const res = await request(app)
      .get(`/api/v1/warga/${WARGA_ID}/keluarga`)
      .set('Authorization', `Bearer ${wargaOtherToken()}`);

    expect(res.status).toBe(403);
  });
});

// --- POST /api/v1/warga/:id/keluarga ---

describe('POST /api/v1/warga/:id/keluarga', () => {
  const validKeluargaBody = {
    nama: 'Siti',
    nik: '9876543210987654',
    hubungan: 'Istri',
    tglLahir: '1990-01-15',
    jenisKelamin: 'P',
  };

  it('201 — ADMIN adds keluarga', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.anggotaKeluarga.create as jest.Mock).mockResolvedValue({ id: KID_ID, ...validKeluargaBody });

    const res = await request(app)
      .post(`/api/v1/warga/${WARGA_ID}/keluarga`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validKeluargaBody);

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(KID_ID);
  });

  it('400 — invalid jenisKelamin value', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });

    const res = await request(app)
      .post(`/api/v1/warga/${WARGA_ID}/keluarga`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...validKeluargaBody, jenisKelamin: 'X' });

    expect(res.status).toBe(400);
  });
});

// --- PUT /api/v1/warga/:id/keluarga/:kid ---

describe('PUT /api/v1/warga/:id/keluarga/:kid', () => {
  it('200 — ADMIN updates keluarga', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.anggotaKeluarga.findFirst as jest.Mock).mockResolvedValue({ id: KID_ID, wargaId: WARGA_ID });
    (prisma.anggotaKeluarga.update as jest.Mock).mockResolvedValue({ id: KID_ID, nama: 'Siti Baru' });

    const res = await request(app)
      .put(`/api/v1/warga/${WARGA_ID}/keluarga/${KID_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ nama: 'Siti Baru' });

    expect(res.status).toBe(200);
  });

  it('404 — keluarga not found', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.anggotaKeluarga.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .put(`/api/v1/warga/${WARGA_ID}/keluarga/${KID_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ nama: 'Siti Baru' });

    expect(res.status).toBe(404);
  });
});

// --- DELETE /api/v1/warga/:id/keluarga/:kid ---

describe('DELETE /api/v1/warga/:id/keluarga/:kid', () => {
  it('200 — ADMIN deletes keluarga', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.anggotaKeluarga.findFirst as jest.Mock).mockResolvedValue({ id: KID_ID });
    (prisma.anggotaKeluarga.delete as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .delete(`/api/v1/warga/${WARGA_ID}/keluarga/${KID_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
  });

  it('403 — BENDAHARA cannot delete keluarga', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ userId: 'someone' });

    const res = await request(app)
      .delete(`/api/v1/warga/${WARGA_ID}/keluarga/${KID_ID}`)
      .set('Authorization', `Bearer ${bendaharaToken()}`);

    expect(res.status).toBe(403);
  });
});
