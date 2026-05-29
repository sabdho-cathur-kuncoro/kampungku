jest.mock('../../config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-access-secret-minimum-32-characters',
  },
}));

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../auth.middleware';
import { AppError } from '../../utils/errors';

const SECRET = 'test-access-secret-minimum-32-characters';

function makeReq(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  };
}

function makeRes(): Partial<Response> {
  return {};
}

function makeNext(): jest.Mock {
  return jest.fn();
}

describe('authenticate middleware', () => {
  it('sets req.user and calls next() with no args on valid Bearer token', () => {
    const token = jwt.sign(
      { sub: 'user-id-1', role: 'WARGA', tenantId: 'tenant-1' },
      SECRET,
      { expiresIn: '15m' },
    );
    const req = makeReq(`Bearer ${token}`) as Request;
    const next = makeNext();

    authenticate(req, makeRes() as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'user-id-1', role: 'WARGA', tenantId: 'tenant-1' });
  });

  it('sets req.user.tenantId=null for SUPER_ADMIN token', () => {
    const token = jwt.sign(
      { sub: 'super-id', role: 'SUPER_ADMIN', tenantId: null },
      SECRET,
      { expiresIn: '15m' },
    );
    const req = makeReq(`Bearer ${token}`) as Request;
    const next = makeNext();

    authenticate(req, makeRes() as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'super-id', role: 'SUPER_ADMIN', tenantId: null });
  });

  it('calls next(AppError 401) when Authorization header is missing', () => {
    const req = makeReq() as Request;
    const next = makeNext();

    authenticate(req, makeRes() as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
  });

  it('calls next(AppError 401) when header is not Bearer format', () => {
    const req = makeReq('Basic abc123') as Request;
    const next = makeNext();

    authenticate(req, makeRes() as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next(AppError 401) when token is expired', () => {
    const token = jwt.sign({ sub: 'user-id-2', role: 'WARGA' }, SECRET, { expiresIn: '-1s' });
    const req = makeReq(`Bearer ${token}`) as Request;
    const next = makeNext();

    authenticate(req, makeRes() as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next(AppError 401) when token is tampered', () => {
    const token = jwt.sign({ sub: 'user-id-3', role: 'WARGA' }, 'wrong-secret-minimum-32-chars', { expiresIn: '15m' });
    const req = makeReq(`Bearer ${token}`) as Request;
    const next = makeNext();

    authenticate(req, makeRes() as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
