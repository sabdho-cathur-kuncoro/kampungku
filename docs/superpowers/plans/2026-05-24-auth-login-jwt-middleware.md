# Auth Login + JWT Middleware Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `POST /api/v1/auth/login` endpoint and `authenticate` JWT middleware to protect future routes.

**Architecture:** Mirror the existing register pattern exactly — schema → service → controller → router. JWT middleware lives in `src/middlewares/auth.middleware.ts` and attaches `req.user` (typed via `src/types/express.d.ts`). TDD throughout: failing test first, minimal implementation, passing test, commit.

**Tech Stack:** Express 5, TypeScript strict, jsonwebtoken, bcryptjs, Prisma, ioredis, Zod, Jest + ts-jest, Supertest

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/types/express.d.ts` | Augments `Express.Request` with `user?: { id: string; role: Role }` |
| Modify | `src/modules/auth/auth.schema.ts` | Add `loginSchema` + `LoginInput` |
| Modify | `src/modules/auth/auth.service.ts` | Add `authService.login()` |
| Modify | `src/modules/auth/auth.controller.ts` | Add `loginController` |
| Modify | `src/modules/auth/auth.router.ts` | Add `POST /login` route |
| Create | `src/middlewares/auth.middleware.ts` | `authenticate` middleware — verify Bearer JWT |
| Modify | `src/modules/auth/__tests__/auth.service.test.ts` | Add `authService.login` test suite |
| Create | `src/__tests__/auth.login.http.test.ts` | HTTP integration tests for login endpoint |
| Create | `src/middlewares/__tests__/auth.middleware.test.ts` | Unit tests for `authenticate` middleware |

---

## Task 1: TypeScript Request Augmentation

**Files:**
- Create: `src/types/express.d.ts`

No test needed — this is a type declaration. Must be created first so later tasks have `req.user` typed.

- [ ] **Step 1: Create the type declaration file**

```typescript
// src/types/express.d.ts
import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export {};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `kampungku-api/`:
```bash
npx tsc --noEmit
```
Expected: no errors (or only pre-existing errors unrelated to express.d.ts).

- [ ] **Step 3: Commit**

```bash
git add src/types/express.d.ts
git commit -m "feat: augment Express Request with typed user property"
```

---

## Task 2: Login Schema

**Files:**
- Modify: `src/modules/auth/auth.schema.ts`

No separate test — schema is exercised by the HTTP integration test in Task 4.

- [ ] **Step 1: Add `loginSchema` and `LoginInput` to the schema file**

Open `src/modules/auth/auth.schema.ts`. The current content ends at line 18. Append:

```typescript
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(1, 'Password wajib diisi'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/auth/auth.schema.ts
git commit -m "feat: add loginSchema and LoginInput to auth schema"
```

---

## Task 3: Login Service (TDD)

**Files:**
- Modify: `src/modules/auth/__tests__/auth.service.test.ts` (add describe block)
- Modify: `src/modules/auth/auth.service.ts` (add `login` method)

- [ ] **Step 1: Add the failing `authService.login` tests**

Open `src/modules/auth/__tests__/auth.service.test.ts`. The file already has mocks for `database`, `redis`, and `env` at the top, and imports. Add a `bcryptjs` mock directly after the existing mocks at the top of the file (before any imports), and add a new import for `bcrypt`. Then append the new describe block at the end of the file.

The full updated file:

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

import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import { authService } from '../auth.service';
import bcrypt from 'bcryptjs';

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
```

- [ ] **Step 2: Run the new tests to verify they fail**

```bash
cd kampungku-api && npx jest src/modules/auth/__tests__/auth.service.test.ts --verbose
```
Expected: the `authService.login` describe block fails with `TypeError: authService.login is not a function`.

- [ ] **Step 3: Implement `authService.login` in `auth.service.ts`**

Add the `login` method to the `authService` object. Import `LoginInput` at the top. Full updated file:

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
};
```

- [ ] **Step 4: Run all service tests to verify they pass**

```bash
npx jest src/modules/auth/__tests__/auth.service.test.ts --verbose
```
Expected: all tests PASS (both `authService.register` and `authService.login` suites).

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/auth.service.ts src/modules/auth/__tests__/auth.service.test.ts
git commit -m "feat: implement authService.login with TDD"
```

---

## Task 4: Login Controller + Router + HTTP Tests (TDD)

**Files:**
- Create: `src/__tests__/auth.login.http.test.ts`
- Modify: `src/modules/auth/auth.controller.ts`
- Modify: `src/modules/auth/auth.router.ts`

- [ ] **Step 1: Write the failing HTTP integration test**

Create `src/__tests__/auth.login.http.test.ts`:

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

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn(),
}));

import request from 'supertest';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import app from '../app';

const mockUser = {
  id: 'uuid-login-http-1',
  name: 'Budi',
  email: 'budi@test.com',
  phone: '08123456789',
  role: 'WARGA',
  passwordHash: '$2b$12$hashedpassword',
  isActive: true,
};

describe('POST /api/v1/auth/login', () => {
  it('200 — valid credentials returns user + tokens', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'budi@test.com', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Login berhasil');
    expect(res.body.data.user.email).toBe('budi@test.com');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.user).not.toHaveProperty('isActive');
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  it('400 — missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('400 — invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'Password1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('401 — email not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@test.com', password: 'Password1' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email atau password salah');
  });

  it('401 — wrong password', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'budi@test.com', password: 'WrongPass' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email atau password salah');
  });
});
```

- [ ] **Step 2: Run to verify the test fails**

```bash
npx jest src/__tests__/auth.login.http.test.ts --verbose
```
Expected: FAIL — `POST /api/v1/auth/login` returns 404 (route not yet wired).

- [ ] **Step 3: Add `loginController` to `auth.controller.ts`**

Full updated file:

```typescript
import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { successResponse } from '../../utils/response';
import type { RegisterInput, LoginInput } from './auth.schema';

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
```

- [ ] **Step 4: Add the login route to `auth.router.ts`**

Full updated file:

```typescript
import { Router } from 'express';
import { registerController, loginController } from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import { registerSchema, loginSchema } from './auth.schema';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), registerController);
authRouter.post('/login', validate(loginSchema), loginController);
```

- [ ] **Step 5: Run HTTP tests to verify they pass**

```bash
npx jest src/__tests__/auth.login.http.test.ts --verbose
```
Expected: all 5 tests PASS.

- [ ] **Step 6: Run all tests to confirm no regressions**

```bash
npx jest --verbose
```
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/auth/auth.controller.ts src/modules/auth/auth.router.ts src/__tests__/auth.login.http.test.ts
git commit -m "feat: add login controller, route, and HTTP tests"
```

---

## Task 5: JWT Auth Middleware (TDD)

**Files:**
- Create: `src/middlewares/__tests__/auth.middleware.test.ts`
- Create: `src/middlewares/auth.middleware.ts`

- [ ] **Step 1: Write the failing middleware unit test**

Create directory and file `src/middlewares/__tests__/auth.middleware.test.ts`:

```typescript
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
    const token = jwt.sign({ sub: 'user-id-1', role: 'WARGA' }, SECRET, { expiresIn: '15m' });
    const req = makeReq(`Bearer ${token}`) as Request;
    const next = makeNext();

    authenticate(req, makeRes() as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'user-id-1', role: 'WARGA' });
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
```

- [ ] **Step 2: Run to verify the test fails**

```bash
mkdir -p src/middlewares/__tests__ && npx jest src/middlewares/__tests__/auth.middleware.test.ts --verbose
```
Expected: FAIL — `authenticate` not found / module not found.

- [ ] **Step 3: Implement `auth.middleware.ts`**

Create `src/middlewares/auth.middleware.ts`:

```typescript
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Token tidak ditemukan', 401));
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; role: Role };
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new AppError('Token tidak valid', 401));
  }
};
```

- [ ] **Step 4: Run middleware tests to verify they pass**

```bash
npx jest src/middlewares/__tests__/auth.middleware.test.ts --verbose
```
Expected: all 5 tests PASS.

- [ ] **Step 5: Run all tests to confirm no regressions**

```bash
npx jest --verbose
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/middlewares/auth.middleware.ts src/middlewares/__tests__/auth.middleware.test.ts
git commit -m "feat: add JWT authenticate middleware with unit tests"
```

---

## Self-Review Checklist

- [x] `loginSchema` + `LoginInput` — Task 2
- [x] `authService.login()` — Task 3
- [x] bcrypt.compare user enumeration protection — Task 3 (same 401 message for not-found + wrong-password)
- [x] `isActive` check — Task 3
- [x] Redis overwrite on login — Task 3
- [x] `loginController` — Task 4
- [x] Route `POST /login` — Task 4
- [x] `authenticate` middleware — Task 5
- [x] `req.user` TypeScript type — Task 1
- [x] Error messages match spec (`Token tidak ditemukan`, `Token tidak valid`, `Akun tidak aktif`, `Email atau password salah`)
- [x] All test cases from spec covered
- [x] No `passwordHash` / `isActive` in any login response
