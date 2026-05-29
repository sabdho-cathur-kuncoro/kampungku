import type { Role } from '@prisma/client';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../utils/errors';
import { PERMISSIONS, type Permission } from '../config/permissions';

/**
 * authorize(...roles) — passes when:
 *   - user role is in the supplied list, OR
 *   - user role is SUPER_ADMIN (auto-bypass for platform admin).
 *
 * Must run AFTER `authenticate`.
 */
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Tidak terautentikasi', 401));
    }
    if (req.user.role === 'SUPER_ADMIN') return next();
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Tidak memiliki akses', 403));
    }
    next();
  };

/**
 * authorizeStrict(...roles) — explicit role match; SUPER_ADMIN does NOT bypass.
 * Use only for routes that must reject SUPER_ADMIN.
 */
export const authorizeStrict =
  (...roles: Role[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Tidak terautentikasi', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Tidak memiliki akses', 403));
    }
    next();
  };

/**
 * authorizePermission(key) — resolves the permission key to its role list
 * (from config/permissions.ts) and delegates to `authorize`.
 */
export const authorizePermission = (key: Permission): RequestHandler =>
  authorize(...PERMISSIONS[key]);

/**
 * authorizeOwnerOr(roles, getOwnerId) — passes when:
 *   - user role is in `roles`, OR
 *   - user role is SUPER_ADMIN, OR
 *   - user id matches the resource owner returned by `getOwnerId`.
 *
 * `getOwnerId` is async; return null if the resource doesn't exist or has no owner —
 * in that case the request is rejected (403) unless a role match already passed.
 */
export const authorizeOwnerOr =
  (roles: Role[], getOwnerId: (req: Request) => Promise<string | null>): RequestHandler =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Tidak terautentikasi', 401);
      }
      if (req.user.role === 'SUPER_ADMIN') return next();
      if (roles.includes(req.user.role)) return next();

      const ownerId = await getOwnerId(req);
      if (ownerId && ownerId === req.user.id) return next();

      throw new AppError('Tidak memiliki akses', 403);
    } catch (err) {
      next(err);
    }
  };
