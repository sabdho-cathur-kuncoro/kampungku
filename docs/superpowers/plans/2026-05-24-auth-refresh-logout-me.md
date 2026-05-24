# Auth Refresh, Logout, and /me Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `POST /auth/refresh` (with token rotation), `POST /auth/logout`, and `GET /auth/me` to complete the auth flow.

**Architecture:** Mirror existing register/login pattern — schema → service → controller → router, TDD throughout. Refresh tokens are stored in Redis (`refresh:{userId}`); rotation overwrites on each refresh call. Logout is body-based (refresh token) so it works even when the access token is expired. `/me` is protected by the existing `authenticate` middleware.

**Tech Stack:** Express 5, TypeScript strict, jsonwebtoken, Prisma, ioredis, Zod, Jest + ts-jest, Supertest

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/modules/auth/auth.schema.ts` | Add `refreshTokenSchema`, `RefreshTokenInput`, `logoutSchema`, `LogoutInput` |
| Modify | `src/modules/auth/auth.service.ts` | Add `refresh()`, `logout()`, `me()` methods |
| Modify | `src/modules/auth/auth.controller.ts` | Add `refreshController`, `logoutController`, `meController` |
| Modify | `src/modules/auth/auth.router.ts` | Add 3 new routes |
| Modify | `src/modules/auth/__tests__/auth.service.test.ts` | Add test suites for refresh, logout, me |
| Create | `src/__tests__/auth.refresh.http.test.ts` | HTTP integration tests for refresh |
| Create | `src/__tests__/auth.logout.http.test.ts` | HTTP integration tests for logout |
| Create | `src/__tests__/auth.me.http.test.ts` | HTTP integration tests for /me |

---

## Task 1: Schemas

**Files:**
- Modify: `src/modules/auth/auth.schema.ts`

No test needed — schemas are exercised by HTTP integration tests.

- [ ] **Step 1: Append to `auth.schema.ts`**

Open `src/modules/auth/auth.schema.ts` and append at the end:

```typescript
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token wajib diisi'),
  }),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token wajib diisi'),
  }),
});

export type LogoutInput = z.infer<typeof logoutSchema>['body'];
```

Full file after edit:

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
    email: z.string().email('Format email tidak valid'),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(
        /^(?=.*[a-zA-Z])(?=.*\d)/,
        'Password harus mengandung huruf dan angka',
      ),
    phone: z.string().max(15).optional(),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(1, 'Password wajib diisi'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token wajib diisi'),
  }),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token wajib diisi'),
  }),
});

export type LogoutInput = z.infer<typeof logoutSchema>['body'];
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/macbook/Projects/KampungKu/kampungku-api && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/auth/auth.schema.ts
git commit -m "feat: add refreshTokenSchema and logoutSchema"
```

---

## Task 2: Refresh Service (TDD)

**Files:**
- Modify: `src/modules/auth/__tests__/auth.service.test.ts`
- Modify: `src/modules/auth/auth.service.ts`

- [ ] **Step 1: Update redis mock and add failing refresh service tests**

The current redis mock only has `set`. Replace the entire `auth.service.test.ts` with the version below that adds `get` and `del` to the mock, imports `jwt`, and appends an `authService.refresh` describe block:

```typescript
jest.mock('../../../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../../../config/redis', () => ({
  redis: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('../../../config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-access-secret-minimum-32-characters',
    JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-characters',
    JWT_ACCESS_EXPIRES: '15m',
    JWT_REFRESH_EXPIRES: '7d',
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn(),
}));

import jwt from 'jsonwebtoken';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import { authService } from '../auth.service';
import bcrypt from 'bcryptjs';

const REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters';

describe('authService.register', () => {
  it('creates user and returns tokens', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'uuid-123',
      name: 'Budi',
      email: 'budi@test.com',
      phone: '08123456789',
      role: 'WARGA',
    });

    const result = await authService.register({
      name: 'Budi',
      email: 'budi@test.com',
      password: 'Password1',
      phone: '08123456789',
    });

    expect(result.user.email).toBe('budi@test.com');
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
    expect(redis.set).toHaveBeenCalledWith(
      'refresh:uuid-123',
      expect.any(String),
      'EX',
      604800,
    );
  });

  it('throws AppError 409 when email already registered', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

    await expect(
      authService.register({
        name: 'Another',
        email: 'existing@test.com',
        password: 'Password1',
      }),
    ).rejects.toMatchObject({ statusCode: 409, message: 'Email sudah terdaftar' });
  });

  it('bcrypt hashes password before saving', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'uuid-456',
      name: 'Sari',
      email: 'sari@test.com',
      phone: null,
      role: 'WARGA',
    });

    await authService.register({ name: 'Sari', email: 'sari@test.com', password: 'Password1' });

    const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.passwordHash).toBeDefined();
    expect(createCall.data.passwordHash).toMatch(/^\$2[ab]\$/);
  });
});

describe('authService.login', () => {
  const mockUser = {
    id: 'uuid-login-1',
    name: 'Budi',
    email: 'budi@test.com',
    phone: '08123456789',
    role: 'WARGA' as const,
    passwordHash: '$2b$12$hashedpassword',
    isActive: true,
  };

  it('returns user and tokens on valid credentials', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await authService.login({
      email: 'budi@test.com',
      password: 'Password1',
    });

    expect(result.user.email).toBe('budi@test.com');
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('isActive');
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
    expect(redis.set).toHaveBeenCalledWith(
      'refresh:uuid-login-1',
      expect.any(String),
      'EX',
      604800,
    );
  });

  it('throws AppError 401 when email not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      authService.login({ email: 'ghost@test.com', password: 'Password1' }),
    ).rejects.toMatchObject({ statusCode: 401, message: 'Email atau password salah' });
  });

  it('throws AppError 401 when password is wrong', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      authService.login({ email: 'budi@test.com', password: 'WrongPass' }),
    ).rejects.toMatchObject({ statusCode: 401, message: 'Email atau password salah' });
  });

  it('throws AppError 401 when account is inactive', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      authService.login({ email: 'budi@test.com', password: 'Password1' }),
    ).rejects.toMatchObject({ statusCode: 401, message: 'Akun tidak aktif' });
  });

  it('calls bcrypt.compare with input password and stored hash', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await authService.login({ email: 'budi@test.com', password: 'Password1' });

    expect(bcrypt.compare).toHaveBeenCalledWith('Password1', '$2b$12$hashedpassword');
  });
});

describe('authService.refresh', () => {
  it('returns new accessToken and refreshToken on valid token', async () => {
    const storedToken = jwt.sign({ sub: 'uuid-refresh-1' }, REFRESH_SECRET, { expiresIn: '7d' });
    (redis.get as jest.Mock).mockResolvedValue(storedToken);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'uuid-refresh-1', role: 'WARGA' });

    const result = await authService.refresh(storedToken);

    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
    expect(redis.set).toHaveBeenCalledWith(
      'refresh:uuid-refresh-1',
      expect.any(String),
      'EX',
      604800,
    );
  });

  it('throws AppError 401 on invalid JWT', async () => {
    await expect(authService.refresh('not-a-jwt')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Refresh token tidak valid',
    });
  });

  it('throws AppError 401 when Redis has no session', async () => {
    const token = jwt.sign({ sub: 'uuid-refresh-2' }, REFRESH_SECRET, { expiresIn: '7d' });
    (redis.get as jest.Mock).mockResolvedValue(null);

    await expect(authService.refresh(token)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Sesi tidak ditemukan',
    });
  });

  it('throws AppError 401 on token mismatch (replay attack)', async () => {
    const token = jwt.sign({ sub: 'uuid-refresh-3' }, REFRESH_SECRET, { expiresIn: '7d' });
    (redis.get as jest.Mock).mockResolvedValue('different-stored-token');

    await expect(authService.refresh(token)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Refresh token tidak valid',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify the new suite fails**

```bash
cd /Users/macbook/Projects/KampungKu/kampungku-api && npx jest src/modules/auth/__tests__/auth.service.test.ts --verbose
```
Expected: `authService.refresh` tests fail with `TypeError: authService.refresh is not a function`. Existing 8 tests still pass.

- [ ] **Step 3: Implement `authService.refresh` in `auth.service.ts`**

Replace the full file content:

```typescript
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
};
```

- [ ] **Step 4: Run service tests to verify they pass**

```bash
npx jest src/modules/auth/__tests__/auth.service.test.ts --verbose
```
Expected: 12 tests pass (8 existing + 4 refresh).

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/auth.service.ts src/modules/auth/__tests__/auth.service.test.ts
git commit -m "feat: implement authService.refresh with TDD"
```

---

## Task 3: Logout + Me Services (TDD)

**Files:**
- Modify: `src/modules/auth/__tests__/auth.service.test.ts` (append 2 describe blocks)
- Modify: `src/modules/auth/auth.service.ts` (add `logout` and `me` methods)

- [ ] **Step 1: Append failing logout and me tests to `auth.service.test.ts`**

Append the following two describe blocks at the end of the file (after the `authService.refresh` suite):

```typescript
describe('authService.logout', () => {
  it('deletes Redis session on valid token', async () => {
    const token = jwt.sign({ sub: 'uuid-logout-1' }, REFRESH_SECRET, { expiresIn: '7d' });

    await authService.logout(token);

    expect(redis.del).toHaveBeenCalledWith('refresh:uuid-logout-1');
  });

  it('does not throw and does not call redis.del on invalid JWT', async () => {
    await expect(authService.logout('not-a-jwt')).resolves.toBeUndefined();
    expect(redis.del).not.toHaveBeenCalled();
  });
});

describe('authService.me', () => {
  it('returns user profile without passwordHash', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'uuid-me-1',
      name: 'Budi',
      email: 'budi@test.com',
      phone: '08123456789',
      role: 'WARGA',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    });

    const result = await authService.me('uuid-me-1');

    expect(result.email).toBe('budi@test.com');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.isActive).toBe(true);
  });

  it('throws AppError 404 when user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(authService.me('nonexistent-id')).rejects.toMatchObject({
      statusCode: 404,
      message: 'User tidak ditemukan',
    });
  });
});
```

- [ ] **Step 2: Run to verify the new suites fail**

```bash
npx jest src/modules/auth/__tests__/auth.service.test.ts --verbose
```
Expected: `authService.logout` and `authService.me` tests fail. 12 existing tests still pass.

- [ ] **Step 3: Implement `logout` and `me` in `auth.service.ts`**

Add the following two methods to the `authService` object (after the `refresh` method, before the closing `};`):

```typescript
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
```

- [ ] **Step 4: Run all service tests**

```bash
npx jest src/modules/auth/__tests__/auth.service.test.ts --verbose
```
Expected: 16 tests pass (12 + 2 logout + 2 me).

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/auth.service.ts src/modules/auth/__tests__/auth.service.test.ts
git commit -m "feat: implement authService.logout and authService.me with TDD"
```

---

## Task 4: Refresh Endpoint (TDD)

**Files:**
- Create: `src/__tests__/auth.refresh.http.test.ts`
- Modify: `src/modules/auth/auth.controller.ts`
- Modify: `src/modules/auth/auth.router.ts`

- [ ] **Step 1: Write the failing HTTP test**

Create `src/__tests__/auth.refresh.http.test.ts`:

```typescript
jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../config/redis', () => ({
  redis: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
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

import jwt from 'jsonwebtoken';
import request from 'supertest';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import app from '../app';

const REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters';

describe('POST /api/v1/auth/refresh', () => {
  it('200 — valid refresh token returns new access and refresh tokens', async () => {
    const refreshToken = jwt.sign({ sub: 'uuid-1' }, REFRESH_SECRET, { expiresIn: '7d' });
    (redis.get as jest.Mock).mockResolvedValue(refreshToken);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'uuid-1', role: 'WARGA' });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Token diperbarui');
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  it('400 — missing refreshToken field', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('401 — invalid JWT string', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'not-a-jwt' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Refresh token tidak valid');
  });

  it('401 — Redis has no session', async () => {
    const refreshToken = jwt.sign({ sub: 'uuid-2' }, REFRESH_SECRET, { expiresIn: '7d' });
    (redis.get as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Sesi tidak ditemukan');
  });
});
```

- [ ] **Step 2: Run to verify test fails**

```bash
npx jest src/__tests__/auth.refresh.http.test.ts --verbose
```
Expected: FAIL — 404 on `POST /api/v1/auth/refresh` (route not yet wired).

- [ ] **Step 3: Add `refreshController` to `auth.controller.ts`**

Replace full file content:

```typescript
import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { successResponse } from '../../utils/response';
import type { RegisterInput, LoginInput, RefreshTokenInput, LogoutInput } from './auth.schema';

export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await authService.register(req.body as RegisterInput);
    res.status(201).json(successResponse('Registrasi berhasil', data));
  } catch (error) {
    next(error);
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await authService.login(req.body as LoginInput);
    res.status(200).json(successResponse('Login berhasil', data));
  } catch (error) {
    next(error);
  }
};

export const refreshController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body as RefreshTokenInput;
    const data = await authService.refresh(refreshToken);
    res.status(200).json(successResponse('Token diperbarui', data));
  } catch (error) {
    next(error);
  }
};

export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body as LogoutInput;
    await authService.logout(refreshToken);
    res.status(200).json(successResponse('Logout berhasil'));
  } catch (error) {
    next(error);
  }
};

export const meController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await authService.me(req.user!.id);
    res.status(200).json(successResponse('Data berhasil diambil', data));
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 4: Add the refresh route to `auth.router.ts`**

Replace full file content:

```typescript
import { Router } from 'express';
import { registerController, loginController, refreshController, logoutController, meController } from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { registerSchema, loginSchema, refreshTokenSchema, logoutSchema } from './auth.schema';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), registerController);
authRouter.post('/login', validate(loginSchema), loginController);
authRouter.post('/refresh', validate(refreshTokenSchema), refreshController);
authRouter.post('/logout', validate(logoutSchema), logoutController);
authRouter.get('/me', authenticate, meController);
```

- [ ] **Step 5: Run refresh HTTP tests**

```bash
npx jest src/__tests__/auth.refresh.http.test.ts --verbose
```
Expected: 4 tests PASS.

- [ ] **Step 6: Run all tests to check for regressions**

```bash
npx jest --verbose
```
Expected: all 27 tests pass (16 service + 4 refresh HTTP + 4 register HTTP + 3 existing... wait: 16 service + 4 refresh HTTP + 4 register HTTP + 5 login HTTP + 5 middleware = 34... 

Actual count: 16 service + 5 middleware + 4 register HTTP + 5 login HTTP + 4 refresh HTTP = 34 tests).

- [ ] **Step 7: Commit**

```bash
git add src/modules/auth/auth.controller.ts src/modules/auth/auth.router.ts src/__tests__/auth.refresh.http.test.ts
git commit -m "feat: add refresh controller, route, and HTTP tests"
```

---

## Task 5: Logout Endpoint (TDD)

**Files:**
- Create: `src/__tests__/auth.logout.http.test.ts`
- (auth.controller.ts and auth.router.ts already have logout wired from Task 4)

- [ ] **Step 1: Write the failing HTTP test**

Create `src/__tests__/auth.logout.http.test.ts`:

```typescript
jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../config/redis', () => ({
  redis: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
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

import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../app';

const REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters';

describe('POST /api/v1/auth/logout', () => {
  it('200 — valid refresh token returns success', async () => {
    const refreshToken = jwt.sign({ sub: 'uuid-1' }, REFRESH_SECRET, { expiresIn: '7d' });

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Logout berhasil');
  });

  it('400 — missing refreshToken field', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('200 — even an expired/invalid token returns success (best-effort logout)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'invalid-token-string' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify tests pass** (controller + route already wired in Task 4)

```bash
npx jest src/__tests__/auth.logout.http.test.ts --verbose
```
Expected: all 3 tests PASS (logout was already wired in Task 4).

- [ ] **Step 3: Run all tests to confirm no regressions**

```bash
npx jest --verbose
```
Expected: 37 tests pass (34 from Task 4 + 3 logout HTTP).

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/auth.logout.http.test.ts
git commit -m "feat: add logout HTTP integration tests"
```

---

## Task 6: Me Endpoint (TDD)

**Files:**
- Create: `src/__tests__/auth.me.http.test.ts`
- (auth.controller.ts and auth.router.ts already have /me wired from Task 4)

- [ ] **Step 1: Write the failing HTTP test**

Create `src/__tests__/auth.me.http.test.ts`:

```typescript
jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../config/redis', () => ({
  redis: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
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

import jwt from 'jsonwebtoken';
import request from 'supertest';
import { prisma } from '../config/database';
import app from '../app';

const ACCESS_SECRET = 'test-access-secret-minimum-32-characters';

describe('GET /api/v1/auth/me', () => {
  it('200 — returns user profile for authenticated request', async () => {
    const token = jwt.sign({ sub: 'uuid-me-1', role: 'WARGA' }, ACCESS_SECRET, { expiresIn: '15m' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'uuid-me-1',
      name: 'Budi',
      email: 'budi@test.com',
      phone: '08123456789',
      role: 'WARGA',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Data berhasil diambil');
    expect(res.body.data.email).toBe('budi@test.com');
    expect(res.body.data.id).toBe('uuid-me-1');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('401 — no Authorization header', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('401 — invalid access token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify tests pass** (controller + route already wired in Task 4)

```bash
npx jest src/__tests__/auth.me.http.test.ts --verbose
```
Expected: all 3 tests PASS.

- [ ] **Step 3: Run full test suite**

```bash
npx jest --verbose
```
Expected: 40 tests pass (37 + 3 me HTTP).

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/auth.me.http.test.ts
git commit -m "feat: add /me HTTP integration tests"
```

---

## Self-Review

- [x] `refreshTokenSchema` + `RefreshTokenInput` — Task 1
- [x] `logoutSchema` + `LogoutInput` — Task 1
- [x] `authService.refresh()` — rotate token, check Redis match, DB lookup for role — Task 2
- [x] `authService.logout()` — best-effort del, no error on invalid JWT — Task 3
- [x] `authService.me()` — DB lookup, 404 if not found, no passwordHash — Task 3
- [x] `refreshController`, `logoutController`, `meController` — Task 4
- [x] All 4 routes wired in `auth.router.ts` — Task 4
- [x] Replay attack protection tested (mismatch → 401) — Task 2
- [x] Best-effort logout (invalid token → 200) tested — Task 5
- [x] `GET /me` protected by `authenticate` middleware — Task 4 router
- [x] All error messages match spec exactly
- [x] No `passwordHash` in any response
- [x] Type names consistent: `RefreshTokenInput`, `LogoutInput` used in controller and schema
