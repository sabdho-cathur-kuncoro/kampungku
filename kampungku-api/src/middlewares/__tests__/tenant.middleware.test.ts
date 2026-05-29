jest.mock('../../config/database', () => ({
  prisma: {
    rT: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../config/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  },
}));

import { Request, Response, NextFunction } from 'express';
import { tenantScope, isTenantActive, tenantActiveCacheKey } from '../tenant.middleware';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { AppError } from '../../utils/errors';

function makeReq(opts: {
  user?: { id: string; role: string; tenantId: string | null };
  header?: string;
  query?: Record<string, string>;
}): Partial<Request> {
  return {
    user: opts.user as Request['user'],
    query: opts.query ?? {},
    header: ((name: string) => {
      if (name === 'X-Tenant-Id') return opts.header;
      return undefined;
    }) as Request['header'],
  };
}

const makeNext = (): jest.Mock => jest.fn();
const noopRes = {} as Response;

beforeEach(() => {
  (redis.get as jest.Mock).mockReset();
  (redis.set as jest.Mock).mockClear();
  (prisma.rT.findUnique as jest.Mock).mockReset();
});

describe('tenantScope middleware', () => {
  it('sets req.tenantId from req.user.tenantId for normal user (active tenant cached)', async () => {
    (redis.get as jest.Mock).mockResolvedValue('1');
    const req = makeReq({ user: { id: 'u1', role: 'WARGA', tenantId: 'tenant-A' } }) as Request;
    const next = makeNext();

    await tenantScope(req, noopRes, next as NextFunction);

    expect(req.tenantId).toBe('tenant-A');
    expect(next).toHaveBeenCalledWith();
    expect(prisma.rT.findUnique).not.toHaveBeenCalled();
  });

  it('uses X-Tenant-Id header when user is SUPER_ADMIN (active tenant)', async () => {
    (redis.get as jest.Mock).mockResolvedValue('1');
    const req = makeReq({
      user: { id: 'super', role: 'SUPER_ADMIN', tenantId: null },
      header: 'tenant-X',
    }) as Request;
    const next = makeNext();

    await tenantScope(req, noopRes, next as NextFunction);

    expect(req.tenantId).toBe('tenant-X');
    expect(next).toHaveBeenCalledWith();
  });

  it('uses ?tenantId= query when SUPER_ADMIN passes no header', async () => {
    (redis.get as jest.Mock).mockResolvedValue('1');
    const req = makeReq({
      user: { id: 'super', role: 'SUPER_ADMIN', tenantId: null },
      query: { tenantId: 'tenant-Q' },
    }) as Request;
    const next = makeNext();

    await tenantScope(req, noopRes, next as NextFunction);

    expect(req.tenantId).toBe('tenant-Q');
  });

  it('rejects SUPER_ADMIN with no tenant hint (400)', async () => {
    const req = makeReq({ user: { id: 'super', role: 'SUPER_ADMIN', tenantId: null } }) as Request;
    const next = makeNext();

    await tenantScope(req, noopRes, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
  });

  it('rejects normal user with no tenantId (403)', async () => {
    const req = makeReq({ user: { id: 'u', role: 'ADMIN', tenantId: null } }) as Request;
    const next = makeNext();

    await tenantScope(req, noopRes, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('rejects when not authenticated (401)', async () => {
    const req = makeReq({}) as Request;
    const next = makeNext();

    await tenantScope(req, noopRes, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('rejects 403 when tenant is inactive (cache hit)', async () => {
    (redis.get as jest.Mock).mockResolvedValue('0');
    const req = makeReq({ user: { id: 'u1', role: 'WARGA', tenantId: 'tenant-A' } }) as Request;
    const next = makeNext();

    await tenantScope(req, noopRes, next as NextFunction);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: 'Tenant tidak aktif' }),
    );
  });

  it('rejects 403 when tenant is inactive (cache miss → DB lookup)', async () => {
    (redis.get as jest.Mock).mockResolvedValue(null);
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue({ isActive: false });

    const req = makeReq({ user: { id: 'u1', role: 'WARGA', tenantId: 'tenant-A' } }) as Request;
    const next = makeNext();

    await tenantScope(req, noopRes, next as NextFunction);

    expect(prisma.rT.findUnique).toHaveBeenCalledWith({
      where: { id: 'tenant-A' },
      select: { isActive: true },
    });
    expect(redis.set).toHaveBeenCalledWith(
      tenantActiveCacheKey('tenant-A'),
      '0',
      'EX',
      30,
    );
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: 'Tenant tidak aktif' }),
    );
  });

  it('treats nonexistent tenant as inactive (DB returns null)', async () => {
    (redis.get as jest.Mock).mockResolvedValue(null);
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeReq({ user: { id: 'u1', role: 'WARGA', tenantId: 'missing' } }) as Request;
    const next = makeNext();

    await tenantScope(req, noopRes, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});

describe('isTenantActive', () => {
  it('returns true on cache hit "1"', async () => {
    (redis.get as jest.Mock).mockResolvedValue('1');
    expect(await isTenantActive('t')).toBe(true);
    expect(prisma.rT.findUnique).not.toHaveBeenCalled();
  });

  it('returns false on cache hit "0"', async () => {
    (redis.get as jest.Mock).mockResolvedValue('0');
    expect(await isTenantActive('t')).toBe(false);
  });

  it('queries DB on miss and caches result', async () => {
    (redis.get as jest.Mock).mockResolvedValue(null);
    (prisma.rT.findUnique as jest.Mock).mockResolvedValue({ isActive: true });

    const result = await isTenantActive('tenant-Z');

    expect(result).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(tenantActiveCacheKey('tenant-Z'), '1', 'EX', 30);
  });
});
