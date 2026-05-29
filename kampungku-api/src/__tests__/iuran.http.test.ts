jest.mock('../config/database', () => ({
  prisma: {
    iuranTagihan: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    warga: { findFirst: jest.fn() },
    jenisIuran: { findFirst: jest.fn() },
  },
}));

jest.mock('../config/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue('1'),
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

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import app from '../app';

const SECRET = 'test-access-secret-minimum-32-characters';
const TENANT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const WARGA_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const WARGA_USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const JENIS_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const TAGIHAN_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const makeToken = (sub: string, role: string, tenantId: string | null) =>
  jwt.sign({ sub, role, tenantId }, SECRET, { expiresIn: '15m' });

const adminToken = () => makeToken('admin-user', 'ADMIN', TENANT_ID);
const bendaharaToken = () => makeToken('bendahara-user', 'BENDAHARA', TENANT_ID);
const ketuaRtToken = () => makeToken('ketua-user', 'KETUA_RT', TENANT_ID);
const wargaOwnToken = () => makeToken(WARGA_USER_ID, 'WARGA', TENANT_ID);
const wargaOtherToken = () => makeToken('other-warga-user', 'WARGA', TENANT_ID);

const mockTagihan = {
  id: TAGIHAN_ID,
  wargaId: WARGA_ID,
  jenisIuranId: JENIS_ID,
  rtId: TENANT_ID,
  bulan: 5,
  tahun: 2026,
  jumlah: '50000.00',
  status: 'BELUM_BAYAR',
  tglBayar: null,
  verifiedBy: null,
  catatan: null,
  createdAt: new Date().toISOString(),
  warga: {
    id: WARGA_ID,
    userId: WARGA_USER_ID,
    nik: '1234567890123456',
    user: { id: WARGA_USER_ID, name: 'Budi', email: 'budi@example.com' },
  },
  jenisIuran: { id: JENIS_ID, nama: 'Iuran RT' },
};

const mockJenisIuran = {
  id: JENIS_ID,
  tenantId: TENANT_ID,
  nama: 'Iuran RT',
  jumlah: new Prisma.Decimal(50000),
  keterangan: null,
  isAktif: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  const { redis } = jest.requireMock('../config/redis');
  redis.get.mockResolvedValue('1');
});

// --- GET /api/v1/iuran ---

describe('GET /api/v1/iuran', () => {
  it('200 — ADMIN lists all tagihan', async () => {
    (prisma.iuranTagihan.findMany as jest.Mock).mockResolvedValue([mockTagihan]);

    const res = await request(app)
      .get('/api/v1/iuran')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('200 — BENDAHARA can list', async () => {
    (prisma.iuranTagihan.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/iuran')
      .set('Authorization', `Bearer ${bendaharaToken()}`);

    expect(res.status).toBe(200);
  });

  it('403 — WARGA cannot list all tagihan', async () => {
    const res = await request(app)
      .get('/api/v1/iuran')
      .set('Authorization', `Bearer ${wargaOwnToken()}`);

    expect(res.status).toBe(403);
  });

  it('401 — no auth', async () => {
    const res = await request(app).get('/api/v1/iuran');
    expect(res.status).toBe(401);
  });
});

// --- GET /api/v1/iuran/tunggakan ---

describe('GET /api/v1/iuran/tunggakan', () => {
  it('200 — ADMIN gets tunggakan', async () => {
    (prisma.iuranTagihan.findMany as jest.Mock).mockResolvedValue([mockTagihan]);

    const res = await request(app)
      .get('/api/v1/iuran/tunggakan')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('403 — KETUA_RT cannot access tunggakan', async () => {
    const res = await request(app)
      .get('/api/v1/iuran/tunggakan')
      .set('Authorization', `Bearer ${ketuaRtToken()}`);

    expect(res.status).toBe(403);
  });
});

// --- GET /api/v1/iuran/laporan ---

describe('GET /api/v1/iuran/laporan', () => {
  it('200 — BENDAHARA gets laporan', async () => {
    (prisma.iuranTagihan.count as jest.Mock).mockResolvedValue(5);
    (prisma.iuranTagihan.aggregate as jest.Mock).mockResolvedValue({
      _count: 3,
      _sum: { jumlah: new Prisma.Decimal(150000) },
    });

    const res = await request(app)
      .get('/api/v1/iuran/laporan?tahun=2026')
      .set('Authorization', `Bearer ${bendaharaToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ totalTagihan: 5 });
  });

  it('403 — WARGA cannot access laporan', async () => {
    const res = await request(app)
      .get('/api/v1/iuran/laporan')
      .set('Authorization', `Bearer ${wargaOwnToken()}`);

    expect(res.status).toBe(403);
  });
});

// --- GET /api/v1/iuran/warga/:wargaId ---

describe('GET /api/v1/iuran/warga/:wargaId', () => {
  it('200 — ADMIN views any warga tagihan', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.iuranTagihan.findMany as jest.Mock).mockResolvedValue([mockTagihan]);

    const res = await request(app)
      .get(`/api/v1/iuran/warga/${WARGA_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
  });

  it('200 — WARGA views own tagihan', async () => {
    (prisma.warga.findFirst as jest.Mock)
      .mockResolvedValueOnce({ userId: WARGA_USER_ID }) // getOwnerUserIdByWargaId
      .mockResolvedValueOnce({ id: WARGA_ID });         // getByWarga check

    (prisma.iuranTagihan.findMany as jest.Mock).mockResolvedValue([mockTagihan]);

    const res = await request(app)
      .get(`/api/v1/iuran/warga/${WARGA_ID}`)
      .set('Authorization', `Bearer ${wargaOwnToken()}`);

    expect(res.status).toBe(200);
  });

  it("403 — WARGA cannot view another warga's tagihan", async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ userId: 'someone-else' });

    const res = await request(app)
      .get(`/api/v1/iuran/warga/${WARGA_ID}`)
      .set('Authorization', `Bearer ${wargaOtherToken()}`);

    expect(res.status).toBe(403);
  });

  it('400 — invalid UUID', async () => {
    const res = await request(app)
      .get('/api/v1/iuran/warga/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(400);
  });
});

// --- POST /api/v1/iuran/tagihan ---

describe('POST /api/v1/iuran/tagihan', () => {
  const validBody = {
    wargaId: WARGA_ID,
    jenisIuranId: JENIS_ID,
    bulan: 5,
    tahun: 2026,
  };

  it('201 — ADMIN creates tagihan', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue(mockJenisIuran);
    (prisma.iuranTagihan.create as jest.Mock).mockResolvedValue(mockTagihan);

    const res = await request(app)
      .post('/api/v1/iuran/tagihan')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(TAGIHAN_ID);
  });

  it('403 — KETUA_RT cannot create tagihan', async () => {
    const res = await request(app)
      .post('/api/v1/iuran/tagihan')
      .set('Authorization', `Bearer ${ketuaRtToken()}`)
      .send(validBody);

    expect(res.status).toBe(403);
  });

  it('400 — bulan out of range', async () => {
    const res = await request(app)
      .post('/api/v1/iuran/tagihan')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...validBody, bulan: 13 });

    expect(res.status).toBe(400);
  });

  it('409 — duplicate tagihan', async () => {
    (prisma.warga.findFirst as jest.Mock).mockResolvedValue({ id: WARGA_ID });
    (prisma.jenisIuran.findFirst as jest.Mock).mockResolvedValue(mockJenisIuran);

    const dupErr = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: '5.0.0',
    });
    (prisma.iuranTagihan.create as jest.Mock).mockRejectedValue(dupErr);

    const res = await request(app)
      .post('/api/v1/iuran/tagihan')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validBody);

    expect(res.status).toBe(409);
  });
});

// --- POST /api/v1/iuran/bayar ---

describe('POST /api/v1/iuran/bayar', () => {
  const belumBayarTagihan = { ...mockTagihan, status: 'BELUM_BAYAR', warga: { userId: WARGA_USER_ID } };

  it('200 — WARGA pays own tagihan', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue(belumBayarTagihan);
    (prisma.iuranTagihan.update as jest.Mock).mockResolvedValue({
      ...mockTagihan,
      status: 'MENUNGGU_VERIFIKASI',
    });

    const res = await request(app)
      .post('/api/v1/iuran/bayar')
      .set('Authorization', `Bearer ${wargaOwnToken()}`)
      .send({ tagihanId: TAGIHAN_ID });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('MENUNGGU_VERIFIKASI');
  });

  it("403 — WARGA cannot pay another's tagihan", async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue(belumBayarTagihan);

    const res = await request(app)
      .post('/api/v1/iuran/bayar')
      .set('Authorization', `Bearer ${wargaOtherToken()}`)
      .send({ tagihanId: TAGIHAN_ID });

    expect(res.status).toBe(403);
  });

  it('200 — ADMIN can pay for any warga', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue(belumBayarTagihan);
    (prisma.iuranTagihan.update as jest.Mock).mockResolvedValue({
      ...mockTagihan,
      status: 'MENUNGGU_VERIFIKASI',
    });

    const res = await request(app)
      .post('/api/v1/iuran/bayar')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ tagihanId: TAGIHAN_ID });

    expect(res.status).toBe(200);
  });

  it('400 — tagihan already paid', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue({
      ...belumBayarTagihan,
      status: 'LUNAS',
    });

    const res = await request(app)
      .post('/api/v1/iuran/bayar')
      .set('Authorization', `Bearer ${wargaOwnToken()}`)
      .send({ tagihanId: TAGIHAN_ID });

    expect(res.status).toBe(400);
  });

  it('400 — missing tagihanId', async () => {
    const res = await request(app)
      .post('/api/v1/iuran/bayar')
      .set('Authorization', `Bearer ${wargaOwnToken()}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// --- PUT /api/v1/iuran/:id/verifikasi ---

describe('PUT /api/v1/iuran/:id/verifikasi', () => {
  const menungguTagihan = { ...mockTagihan, status: 'MENUNGGU_VERIFIKASI', catatan: null };

  it('200 — BENDAHARA approves payment', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue(menungguTagihan);
    (prisma.iuranTagihan.update as jest.Mock).mockResolvedValue({ ...menungguTagihan, status: 'LUNAS' });

    const res = await request(app)
      .put(`/api/v1/iuran/${TAGIHAN_ID}/verifikasi`)
      .set('Authorization', `Bearer ${bendaharaToken()}`)
      .send({ approve: true });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('LUNAS');
  });

  it('200 — BENDAHARA rejects payment', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue(menungguTagihan);
    (prisma.iuranTagihan.update as jest.Mock).mockResolvedValue({ ...menungguTagihan, status: 'BELUM_BAYAR' });

    const res = await request(app)
      .put(`/api/v1/iuran/${TAGIHAN_ID}/verifikasi`)
      .set('Authorization', `Bearer ${bendaharaToken()}`)
      .send({ approve: false });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('BELUM_BAYAR');
  });

  it('403 — WARGA cannot verify', async () => {
    const res = await request(app)
      .put(`/api/v1/iuran/${TAGIHAN_ID}/verifikasi`)
      .set('Authorization', `Bearer ${wargaOwnToken()}`)
      .send({ approve: true });

    expect(res.status).toBe(403);
  });

  it('400 — missing approve field', async () => {
    const res = await request(app)
      .put(`/api/v1/iuran/${TAGIHAN_ID}/verifikasi`)
      .set('Authorization', `Bearer ${bendaharaToken()}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('404 — tagihan not found', async () => {
    (prisma.iuranTagihan.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .put(`/api/v1/iuran/${TAGIHAN_ID}/verifikasi`)
      .set('Authorization', `Bearer ${bendaharaToken()}`)
      .send({ approve: true });

    expect(res.status).toBe(404);
  });
});
