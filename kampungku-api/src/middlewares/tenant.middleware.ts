import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { AppError } from '../utils/errors';

const TENANT_ACTIVE_TTL_SECONDS = 30;

export const tenantActiveCacheKey = (tenantId: string): string => `tenant:active:${tenantId}`;

/**
 * Returns true if the given tenant is currently active. Result is cached in
 * Redis for TENANT_ACTIVE_TTL_SECONDS to avoid DB round-trips on every request.
 *
 * Cache values: '1' = active, '0' = inactive.
 * Invalidate via `redis.del(tenantActiveCacheKey(id))` when the flag changes.
 */
export const isTenantActive = async (tenantId: string): Promise<boolean> => {
  const key = tenantActiveCacheKey(tenantId);
  const cached = await redis.get(key);
  if (cached === '1') return true;
  if (cached === '0') return false;

  const tenant = await prisma.rT.findUnique({
    where: { id: tenantId },
    select: { isActive: true },
  });
  const active = tenant?.isActive === true;
  await redis.set(key, active ? '1' : '0', 'EX', TENANT_ACTIVE_TTL_SECONDS);
  return active;
};

/**
 * tenantScope — resolves tenantId for the current request AND enforces tenant.isActive.
 *
 * - Regular users (tenantId set on JWT): req.tenantId = user.tenantId.
 * - SUPER_ADMIN (tenantId null): must pass X-Tenant-Id header or ?tenantId= query.
 * - Tenant must be active; otherwise rejects 403.
 *
 * Must run AFTER `authenticate`. Routes under /api/v1/admin/* should NOT use this —
 * they are cross-tenant by design.
 */
export const tenantScope = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Tidak terautentikasi', 401);
    }

    let resolved: string;
    if (req.user.role === 'SUPER_ADMIN') {
      const headerTenant = req.header('X-Tenant-Id');
      const queryTenant = typeof req.query.tenantId === 'string' ? req.query.tenantId : undefined;
      const explicit = headerTenant ?? queryTenant;
      if (!explicit) {
        throw new AppError(
          'SUPER_ADMIN harus menyertakan tenantId via header X-Tenant-Id atau query ?tenantId=',
          400,
        );
      }
      resolved = explicit;
    } else {
      if (!req.user.tenantId) {
        throw new AppError('Akun tidak terhubung ke tenant manapun', 403);
      }
      resolved = req.user.tenantId;
    }

    const active = await isTenantActive(resolved);
    if (!active) {
      throw new AppError('Tenant tidak aktif', 403);
    }

    req.tenantId = resolved;
    next();
  } catch (err) {
    next(err);
  }
};
