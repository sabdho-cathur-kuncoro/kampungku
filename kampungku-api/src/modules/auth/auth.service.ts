import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import type { RegisterInput, LoginInput } from './auth.schema';

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
const DUMMY_HASH = '$2b$12$dummyhashfortimingnormalizationxx';

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new AppError('Email sudah terdaftar', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    const accessToken = jwt.sign(
      { sub: user.id, role: user.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES as StringValue },
    );

    const refreshToken = jwt.sign(
      { sub: user.id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES as StringValue },
    );

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

    const accessToken = jwt.sign(
      { sub: found.id, role: found.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES as StringValue },
    );

    const refreshToken = jwt.sign(
      { sub: found.id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES as StringValue },
    );

    await redis.set(`refresh:${found.id}`, refreshToken, 'EX', REFRESH_TTL_SECONDS);

    const user = {
      id: found.id,
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
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
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
      select: { id: true, role: true },
    });

    if (!user) {
      throw new AppError('User tidak ditemukan', 401);
    }

    const accessToken = jwt.sign(
      { sub: user.id, role: user.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES as StringValue },
    );

    const refreshToken = jwt.sign(
      { sub: user.id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES as StringValue },
    );

    await redis.set(`refresh:${user.id}`, refreshToken, 'EX', REFRESH_TTL_SECONDS);

    return { accessToken, refreshToken };
  },

  async logout(token: string) {
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
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
