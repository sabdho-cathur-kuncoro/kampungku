import { Request, Response, NextFunction } from 'express';
import { tenantScope } from '../tenant.middleware';
import { AppError } from '../../utils/errors';

function makeReq(opts: {
  user?: { id: string; role: 'SUPER_ADMIN' | 'ADMIN' | 'WARGA'; tenantId: string | null };
  header?: string;
  query?: Record<string, string>;
}): Partial<Request> {
  return {
    user: opts.user,
    query: opts.query ?? {},
    header: ((name: string) => {
      if (name === 'X-Tenant-Id') return opts.header;
      return undefined;
    }) as Request['header'],
  };
}

const makeNext = (): jest.Mock => jest.fn();

describe('tenantScope middleware', () => {
  it('sets req.tenantId from req.user.tenantId for normal user', () => {
    const req = makeReq({
      user: { id: 'u1', role: 'WARGA', tenantId: 'tenant-A' },
    }) as Request;
    const next = makeNext();

    tenantScope(req, {} as Response, next as NextFunction);

    expect(req.tenantId).toBe('tenant-A');
    expect(next).toHaveBeenCalledWith();
  });

  it('uses X-Tenant-Id header when user is SUPER_ADMIN', () => {
    const req = makeReq({
      user: { id: 'super', role: 'SUPER_ADMIN', tenantId: null },
      header: 'tenant-X',
    }) as Request;
    const next = makeNext();

    tenantScope(req, {} as Response, next as NextFunction);

    expect(req.tenantId).toBe('tenant-X');
    expect(next).toHaveBeenCalledWith();
  });

  it('uses ?tenantId= query when SUPER_ADMIN passes no header', () => {
    const req = makeReq({
      user: { id: 'super', role: 'SUPER_ADMIN', tenantId: null },
      query: { tenantId: 'tenant-Q' },
    }) as Request;
    const next = makeNext();

    tenantScope(req, {} as Response, next as NextFunction);

    expect(req.tenantId).toBe('tenant-Q');
  });

  it('rejects SUPER_ADMIN with no tenant hint (400)', () => {
    const req = makeReq({
      user: { id: 'super', role: 'SUPER_ADMIN', tenantId: null },
    }) as Request;
    const next = makeNext();

    tenantScope(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
  });

  it('rejects normal user with no tenantId (403)', () => {
    const req = makeReq({
      user: { id: 'u', role: 'ADMIN', tenantId: null },
    }) as Request;
    const next = makeNext();

    tenantScope(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('rejects when not authenticated (401)', () => {
    const req = makeReq({}) as Request;
    const next = makeNext();

    tenantScope(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
