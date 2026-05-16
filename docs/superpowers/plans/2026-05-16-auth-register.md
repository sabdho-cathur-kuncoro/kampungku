# Auth Register Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `POST /api/v1/auth/register` — creates a User account (role WARGA) and returns JWT access + refresh tokens.

**Architecture:** Feature-first module structure (`src/modules/auth/`). Foundation config and middleware files are created first as shared infrastructure. Auth service holds all business logic; controller only handles HTTP. Redis stores refresh tokens; Prisma handles user persistence.

**Tech Stack:** Express 5, TypeScript 6 (strict), Prisma 5, bcryptjs, jsonwebtoken, ioredis, Zod 4, Jest + ts-jest + supertest

---

## File Map

| Status | File | Responsibility |
|---|---|---|
| CREATE | `src/config/env.ts` | Zod-validated env vars, process.exit on invalid |
| CREATE | `src/config/database.ts` | Prisma client singleton |
| CREATE | `src/config/redis.ts` | ioredis client singleton |
| CREATE | `src/utils/errors.ts` | `AppError` class with statusCode |
| CREATE | `src/utils/response.ts` | `successResponse` / `errorResponse` helpers |
| CREATE | `src/middlewares/validate.middleware.ts` | Zod request validation middleware |
| CREATE | `src/middlewares/errorHandler.ts` | Global Express error handler |
| MODIFY | `src/app.ts` | Add JSON, helmet, cors, morgan, rate limit, routes, error handler |
| MODIFY | `src/server.ts` | Import app, listen on env.PORT |
| CREATE | `src/modules/auth/auth.schema.ts` | Zod schema for register body |
| CREATE | `src/modules/auth/auth.service.ts` | `register()` — DB + Redis + JWT |
| CREATE | `src/modules/auth/auth.controller.ts` | `registerController` — HTTP handler |
| CREATE | `src/modules/auth/auth.router.ts` | Mount `POST /register` |
| CREATE | `src/__tests__/auth.register.http.test.ts` | HTTP integration tests |
| CREATE | `src/modules/auth/__tests__/auth.service.test.ts` | Service unit tests |
| MODIFY | `package.json` | Update test script |
| CREATE | `jest.config.js` | Jest config |

---

## Task 1: Install Missing Dependencies

**Files:**
- Modify: `package.json` (via npm)
- Create: `jest.config.js`

- [ ] **Step 1: Install runtime dep**

```bash
cd kampungku-api && npm install ioredis
```

Expected: `added N packages`

- [ ] **Step 2: Install dev deps**

```bash
npm install -D @types/cors jest ts-jest @types/jest supertest @types/supertest
```

Expected: `added N packages`

- [ ] **Step 3: Create jest.config.js**

```javascript
// kampungku-api/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
};
```

- [ ] **Step 4: Update test script in package.json**

In `package.json`, replace:
```json
"test": "echo \"Error: no test specified\" && exit 1"
```
With:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Verify Jest runs (no tests yet)**

```bash
npm test -- --passWithNoTests
```

Expected: `Test Suites: 0 passed`

- [ ] **Step 6: Commit**

```bash
git add jest.config.js package.json package-lock.json
git commit -m "chore: add ioredis, jest, supertest dependencies"
```

---

## Task 2: Foundation Config

**Files:**
- Create: `src/config/env.ts`
- Create: `src/config/database.ts`
- Create: `src/config/redis.ts`

- [ ] **Step 1: Create src/config/env.ts**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment variables tidak valid:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

- [ ] **Step 2: Create src/config/database.ts**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 3: Create src/config/redis.ts**

```typescript
import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/config/env.ts src/config/database.ts src/config/redis.ts
git commit -m "feat: add env validation, prisma, and redis config"
```

---

## Task 3: Utilities + Middlewares

**Files:**
- Create: `src/utils/errors.ts`
- Create: `src/utils/response.ts`
- Create: `src/middlewares/validate.middleware.ts`
- Create: `src/middlewares/errorHandler.ts`

- [ ] **Step 1: Create src/utils/errors.ts**

```typescript
export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

- [ ] **Step 2: Create src/utils/response.ts**

```typescript
interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

interface ErrorItem {
  field: string;
  message: string;
}

export const successResponse = (message: string, data?: unknown, meta?: Meta) => ({
  success: true,
  message,
  data: data ?? null,
  ...(meta ? { meta } : {}),
});

export const errorResponse = (message: string, errors?: ErrorItem[]) => ({
  success: false,
  message,
  ...(errors ? { errors } : {}),
});
```

- [ ] **Step 3: Create src/middlewares/validate.middleware.ts**

```typescript
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

type AnyZodSchema = z.ZodTypeAny;

export const validate = (schema: AnyZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors = result.error.issues.map((issue: z.ZodIssue) => ({
        field: issue.path.slice(1).join('.'),
        message: issue.message,
      }));
      res.status(400).json(errorResponse('Validasi gagal', errors));
      return;
    }

    next();
  };
```

- [ ] **Step 4: Create src/middlewares/errorHandler.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { errorResponse } from '../utils/response';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message));
    return;
  }

  console.error(err);
  res.status(500).json(errorResponse('Terjadi kesalahan server'));
};
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/utils/ src/middlewares/
git commit -m "feat: add response utils, validate middleware, and error handler"
```

---

## Task 4: Wire app.ts + server.ts

**Files:**
- Modify: `src/app.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: Rewrite src/app.ts**

```typescript
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/errorHandler';
import { env } from './config/env';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes will be mounted here (added per module)

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

app.use(errorHandler);

export default app;
```

- [ ] **Step 2: Rewrite src/server.ts**

```typescript
import app from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`🚀 KampungKu API berjalan di port ${env.PORT}`);
});
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app.ts src/server.ts
git commit -m "feat: wire express app with security middleware and server entry"
```

---

## Task 5: Auth Schema

**Files:**
- Create: `src/modules/auth/auth.schema.ts`

- [ ] **Step 1: Create directory**

```bash
mkdir -p src/modules/auth
```

- [ ] **Step 2: Create src/modules/auth/auth.schema.ts**

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
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/modules/auth/auth.schema.ts
git commit -m "feat: add Zod schema for auth register"
```

---

## Task 6: Auth Service — TDD

**Files:**
- Create: `src/modules/auth/__tests__/auth.service.test.ts`
- Create: `src/modules/auth/auth.service.ts`

- [ ] **Step 1: Create test directory**

```bash
mkdir -p src/modules/auth/__tests__
```

- [ ] **Step 2: Write failing service test**

```typescript
// src/modules/auth/__tests__/auth.service.test.ts
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

import { prisma } from '../../../config/database';
import { authService } from '../auth.service';

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
    expect(createCall.data.passwordHash).not.toBe('Password1');
  });
});
```

- [ ] **Step 3: Run test — confirm it fails**

```bash
npm test -- --testPathPattern=auth.service
```

Expected: FAIL — `Cannot find module '../auth.service'`

- [ ] **Step 4: Create src/modules/auth/auth.service.ts**

```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import type { RegisterInput } from './auth.schema';

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
      { expiresIn: env.JWT_ACCESS_EXPIRES as string },
    );

    const refreshToken = jwt.sign(
      { sub: user.id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES as string },
    );

    await redis.set(`refresh:${user.id}`, refreshToken, 'EX', REFRESH_TTL_SECONDS);

    return { user, accessToken, refreshToken };
  },
};
```

- [ ] **Step 5: Run test — confirm passes**

```bash
npm test -- --testPathPattern=auth.service
```

Expected: `PASS src/modules/auth/__tests__/auth.service.test.ts` — 3 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/modules/auth/__tests__/auth.service.test.ts src/modules/auth/auth.service.ts
git commit -m "feat: implement auth register service with TDD"
```

---

## Task 7: Auth Controller + Router — TDD

**Files:**
- Create: `src/__tests__/auth.register.http.test.ts`
- Create: `src/modules/auth/auth.controller.ts`
- Create: `src/modules/auth/auth.router.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Create src/__tests__ directory**

```bash
mkdir -p src/__tests__
```

- [ ] **Step 2: Write failing HTTP test**

```typescript
// src/__tests__/auth.register.http.test.ts
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

import request from 'supertest';
import { prisma } from '../config/database';
import app from '../app';

describe('POST /api/v1/auth/register', () => {
  it('201 — valid registration returns user + tokens', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'uuid-1',
      name: 'Budi',
      email: 'budi@test.com',
      phone: '08123456789',
      role: 'WARGA',
    });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Budi', email: 'budi@test.com', password: 'Password1', phone: '08123456789' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Registrasi berhasil');
    expect(res.body.data.user.email).toBe('budi@test.com');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  it('400 — invalid body (bad email, short password, short name)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('400 — missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('409 — duplicate email', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Sari', email: 'taken@test.com', password: 'Password1' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email sudah terdaftar');
  });
});
```

- [ ] **Step 3: Run HTTP test — confirm fails**

```bash
npm test -- --testPathPattern=auth.register.http
```

Expected: FAIL — `expect(received).toBe(expected): Expected 201, received 404` (route belum ada)

- [ ] **Step 4: Create src/modules/auth/auth.controller.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { successResponse } from '../../utils/response';
import type { RegisterInput } from './auth.schema';

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
```

- [ ] **Step 5: Create src/modules/auth/auth.router.ts**

```typescript
import { Router } from 'express';
import { registerController } from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import { registerSchema } from './auth.schema';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), registerController);
```

- [ ] **Step 6: Mount auth router in src/app.ts**

Add import after existing imports:
```typescript
import { authRouter } from './modules/auth/auth.router';
```

Add route mount after the rate limiter and static files, before the 404 handler:
```typescript
app.use('/api/v1/auth', authRouter);
```

The routes section in app.ts should look like:
```typescript
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/v1/auth', authRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});
```

- [ ] **Step 7: Run all tests — confirm all pass**

```bash
npm test
```

Expected:
```
PASS src/modules/auth/__tests__/auth.service.test.ts
PASS src/__tests__/auth.register.http.test.ts

Test Suites: 2 passed, 2 total
Tests:       7 passed, 7 total
```

- [ ] **Step 8: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/modules/auth/auth.controller.ts src/modules/auth/auth.router.ts src/__tests__/auth.register.http.test.ts src/app.ts
git commit -m "feat: add auth register controller, router, and HTTP tests"
```

---

## Task 8: Smoke Test + Final Commit

**Files:** none

- [ ] **Step 1: Start dev server (requires .env with valid DB + Redis)**

```bash
npm run dev
```

Expected: `🚀 KampungKu API berjalan di port 3001`

- [ ] **Step 2: Test register with curl**

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Password123","phone":"081234567890"}' \
  | jq .
```

Expected:
```json
{
  "success": true,
  "message": "Registrasi berhasil",
  "data": {
    "user": {
      "id": "...",
      "name": "Test User",
      "email": "test@example.com",
      "phone": "081234567890",
      "role": "WARGA"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

- [ ] **Step 3: Test duplicate email**

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Password123"}' \
  | jq .
```

Expected: `"success": false`, `"message": "Email sudah terdaftar"`, status 409

- [ ] **Step 4: Test validation error**

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"A","email":"bad","password":"123"}' \
  | jq .
```

Expected: `"success": false`, `"errors": [...]`, status 400

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete auth register endpoint

- POST /api/v1/auth/register creates User (role WARGA)
- Auto-issues JWT access token (15m) + refresh token (7d)
- Refresh token stored in Redis with 7d TTL
- Returns user data (no passwordHash), accessToken, refreshToken

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
