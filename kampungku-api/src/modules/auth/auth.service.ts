import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import type { StringValue } from 'ms';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import type { RegisterInput, LoginInput } from './auth.schema';

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
const DUMMY_HASH = '$2b$12$dummyhashfortimingnormalizationxx';

interface AccessTokenClaims {
  sub: string;
  role: Role;
  tenantId: string | null;
}

interface RefreshTokenClaims {
  sub: string;
  tenantId: string | null;
}

const signAccess = (claims: AccessTokenClaims): string =>
  jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as StringValue,
  });

const signRefresh = (claims: RefreshTokenClaims): string =>
  jwt.sign(claims, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as StringValue,
  });

export const authService = {
  /**
   * Register a new tenant-scoped user.
   * Requires `tenantId` — typically supplied by:
   *  - SUPER_ADMIN provisioning a new admin (via /admin/tenants)
   *  - existing tenant admin adding a warga
   * Public self-signup is NOT supported (see CLAUDE.md).
   */
  async register(input: RegisterInput, tenantId: string) {
    const tenant = await prisma.rT.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new AppError('Tenant tidak ditemukan', 404);
    }

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new AppError('Email sudah terdaftar', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        tenantId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    const accessToken = signAccess({ sub: user.id, role: user.role, tenantId: user.tenantId });
    const refreshToken = signRefresh({ sub: user.id, tenantId: user.tenantId });

    await redis.set(`refresh:${user.id}`, refreshToken, 'EX', REFRESH_TTL_SECONDS);

    return { user, accessToken, refreshToken };
  },

  async login(input: LoginInput) {
    const found = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!found) {
      await bcrypt.compare(input.password, DUMMY_HASH);
      throw new AppError('Email atau password salah', 401);
    }

    const passwordMatch = await bcrypt.compare(input.password, found.passwordHash);

    if (!passwordMatch) {
      throw new AppError('Email atau password salah', 401);
    }

    if (!found.isActive) {
      throw new AppError('Akun tidak aktif', 401);
    }

    // For non-SUPER_ADMIN: tenant must exist AND be active.
    if (found.role !== 'SUPER_ADMIN') {
      if (!found.tenantId) {
        throw new AppError('Akun tidak terhubung ke tenant manapun', 403);
      }
      const tenant = await prisma.rT.findUnique({ where: { id: found.tenantId } });
      if (!tenant || !tenant.isActive) {
        throw new AppError('Tenant tidak aktif', 403);
      }
    }

    const accessToken = signAccess({ sub: found.id, role: found.role, tenantId: found.tenantId });
    const refreshToken = signRefresh({ sub: found.id, tenantId: found.tenantId });

    await redis.set(`refresh:${found.id}`, refreshToken, 'EX', REFRESH_TTL_SECONDS);

    const user = {
      id: found.id,
      tenantId: found.tenantId,
      name: found.name,
      email: found.email,
      phone: found.phone,
      role: found.role,
    };

    return { user, accessToken, refreshToken };
  },

  async refresh(token: string) {
    let userId: string;

    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenClaims;
      userId = payload.sub;
    } catch {
      throw new AppError('Refresh token tidak valid', 401);
    }

    const stored = await redis.get(`refresh:${userId}`);

    if (!stored) {
      throw new AppError('Sesi tidak ditemukan', 401);
    }

    if (stored !== token) {
      throw new AppError('Refresh token tidak valid', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, tenantId: true },
    });

    if (!user) {
      throw new AppError('User tidak ditemukan', 401);
    }

    const accessToken = signAccess({ sub: user.id, role: user.role, tenantId: user.tenantId });
    const refreshToken = signRefresh({ sub: user.id, tenantId: user.tenantId });

    await redis.set(`refresh:${user.id}`, refreshToken, 'EX', REFRESH_TTL_SECONDS);

    return { accessToken, refreshToken };
  },

  async logout(token: string) {
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenClaims;
      await redis.del(`refresh:${payload.sub}`);
    } catch {
      // Token invalid or expired — session already gone, treat as success
    }
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User tidak ditemukan', 404);
    }

    return user;
  },
};
