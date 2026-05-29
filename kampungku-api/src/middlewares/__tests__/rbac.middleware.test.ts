import { Request, Response, NextFunction } from 'express';
import {
  authorize,
  authorizeStrict,
  authorizePermission,
  authorizeOwnerOr,
} from '../rbac.middleware';
import { AppError } from '../../utils/errors';

function makeReq(user?: { id: string; role: string; tenantId: string | null }): Partial<Request> {
  return user ? { user: user as Request['user'] } : {};
}

const makeNext = (): jest.Mock => jest.fn();
const noopRes = {} as Response;

describe('authorize (with SUPER_ADMIN auto-bypass)', () => {
  it('passes when role matches list', () => {
    const next = makeNext();
    authorize('ADMIN', 'KETUA_RT')(
      makeReq({ id: 'u1', role: 'ADMIN', tenantId: 't1' }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('passes SUPER_ADMIN regardless of list', () => {
    const next = makeNext();
    authorize('ADMIN')(
      makeReq({ id: 'super', role: 'SUPER_ADMIN', tenantId: null }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects 403 when role not in list and not SUPER_ADMIN', () => {
    const next = makeNext();
    authorize('ADMIN')(
      makeReq({ id: 'u', role: 'WARGA', tenantId: 't1' }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
  });

  it('rejects 401 when not authenticated', () => {
    const next = makeNext();
    authorize('ADMIN')(makeReq() as Request, noopRes, next as NextFunction);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

describe('authorizeStrict (no SUPER_ADMIN bypass)', () => {
  it('rejects SUPER_ADMIN when not in list', () => {
    const next = makeNext();
    authorizeStrict('ADMIN')(
      makeReq({ id: 'super', role: 'SUPER_ADMIN', tenantId: null }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('passes SUPER_ADMIN if listed explicitly', () => {
    const next = makeNext();
    authorizeStrict('SUPER_ADMIN', 'ADMIN')(
      makeReq({ id: 'super', role: 'SUPER_ADMIN', tenantId: null }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('passes matching role', () => {
    const next = makeNext();
    authorizeStrict('BENDAHARA')(
      makeReq({ id: 'u', role: 'BENDAHARA', tenantId: 't1' }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith();
  });
});

describe('authorizePermission (delegates to authorize via permissions map)', () => {
  it('passes ADMIN for WARGA_CREATE', () => {
    const next = makeNext();
    authorizePermission('WARGA_CREATE')(
      makeReq({ id: 'u', role: 'ADMIN', tenantId: 't' }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('passes KETUA_RT for WARGA_CREATE', () => {
    const next = makeNext();
    authorizePermission('WARGA_CREATE')(
      makeReq({ id: 'u', role: 'KETUA_RT', tenantId: 't' }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects WARGA for WARGA_CREATE', () => {
    const next = makeNext();
    authorizePermission('WARGA_CREATE')(
      makeReq({ id: 'u', role: 'WARGA', tenantId: 't' }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('SUPER_ADMIN bypasses permission check', () => {
    const next = makeNext();
    authorizePermission('WARGA_DELETE')(
      makeReq({ id: 'super', role: 'SUPER_ADMIN', tenantId: null }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith();
  });
});

describe('authorizeOwnerOr', () => {
  it('passes when role matches', async () => {
    const next = makeNext();
    const getOwner = jest.fn().mockResolvedValue('other-user');
    await authorizeOwnerOr(['ADMIN'], getOwner)(
      makeReq({ id: 'u1', role: 'ADMIN', tenantId: 't' }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith();
    expect(getOwner).not.toHaveBeenCalled(); // role check short-circuits
  });

  it('passes when user is the owner', async () => {
    const next = makeNext();
    const getOwner = jest.fn().mockResolvedValue('u1');
    await authorizeOwnerOr(['ADMIN'], getOwner)(
      makeReq({ id: 'u1', role: 'WARGA', tenantId: 't' }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith();
    expect(getOwner).toHaveBeenCalled();
  });

  it('passes SUPER_ADMIN regardless', async () => {
    const next = makeNext();
    const getOwner = jest.fn().mockResolvedValue('other');
    await authorizeOwnerOr(['ADMIN'], getOwner)(
      makeReq({ id: 'super', role: 'SUPER_ADMIN', tenantId: null }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith();
    expect(getOwner).not.toHaveBeenCalled();
  });

  it('rejects when neither role match nor owner', async () => {
    const next = makeNext();
    const getOwner = jest.fn().mockResolvedValue('other-user');
    await authorizeOwnerOr(['ADMIN'], getOwner)(
      makeReq({ id: 'u1', role: 'WARGA', tenantId: 't' }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('rejects when owner lookup returns null', async () => {
    const next = makeNext();
    const getOwner = jest.fn().mockResolvedValue(null);
    await authorizeOwnerOr(['ADMIN'], getOwner)(
      makeReq({ id: 'u1', role: 'WARGA', tenantId: 't' }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('forwards lookup errors via next()', async () => {
    const next = makeNext();
    const boom = new Error('db down');
    const getOwner = jest.fn().mockRejectedValue(boom);
    await authorizeOwnerOr(['ADMIN'], getOwner)(
      makeReq({ id: 'u1', role: 'WARGA', tenantId: 't' }) as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith(boom);
  });

  it('rejects 401 when not authenticated', async () => {
    const next = makeNext();
    await authorizeOwnerOr(['ADMIN'], async () => 'x')(
      makeReq() as Request,
      noopRes,
      next as NextFunction,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
