import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

/**
 * tenantScope — resolves tenantId for the current request.
 *
 * - Regular users (tenantId set on JWT): req.tenantId = user.tenantId.
 * - SUPER_ADMIN (tenantId null): must pass X-Tenant-Id header or ?tenantId= query
 *   when hitting a domain endpoint. Otherwise reject with 400.
 *
 * Must run AFTER `authenticate`. Routes under /api/v1/admin/* should NOT use this —
 * they are cross-tenant by design.
 */
export const tenantScope = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new AppError('Tidak terautentikasi', 401));
  }

  if (req.user.role === 'SUPER_ADMIN') {
    const headerTenant = req.header('X-Tenant-Id');
    const queryTenant = typeof req.query.tenantId === 'string' ? req.query.tenantId : undefined;
    const explicit = headerTenant ?? queryTenant;

    if (!explicit) {
      return next(
        new AppError(
          'SUPER_ADMIN harus menyertakan tenantId via header X-Tenant-Id atau query ?tenantId=',
          400,
        ),
      );
    }
    req.tenantId = explicit;
    return next();
  }

  if (!req.user.tenantId) {
    return next(new AppError('Akun tidak terhubung ke tenant manapun', 403));
  }

  req.tenantId = req.user.tenantId;
  next();
};
