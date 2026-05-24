# Auth Login + JWT Middleware — Design Spec

**Date:** 2026-05-24
**Scope:** `POST /api/v1/auth/login` endpoint + `authenticate` JWT middleware
**Approach:** Mirror existing register pattern. No new abstractions.

---

## 1. Login Endpoint

### Schema (`auth.schema.ts` — append)

```typescript
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(1, 'Password wajib diisi'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
```

### Service (`auth.service.ts` — add `login` method)

Steps:
1. `prisma.user.findUnique({ where: { email } })` → throw `AppError('Email atau password salah', 401)` if not found
2. `bcrypt.compare(input.password, user.passwordHash)` → throw `AppError('Email atau password salah', 401)` if false
3. Check `user.isActive` → throw `AppError('Akun tidak aktif', 401)` if false
4. Sign `accessToken`: `{ sub: user.id, role: user.role }`, expires `env.JWT_ACCESS_EXPIRES`
5. Sign `refreshToken`: `{ sub: user.id }`, expires `env.JWT_REFRESH_EXPIRES`
6. `redis.set('refresh:{user.id}', refreshToken, 'EX', 604800)` — overwrites previous session
7. Return `{ user: { id, name, email, phone, role }, accessToken, refreshToken }`

**Note:** Email-not-found and wrong-password return the same 401 message ("Email atau password salah") to prevent user enumeration.

### Controller (`auth.controller.ts` — append)

```typescript
export const loginController = async (req, res, next) => {
  try {
    const data = await authService.login(req.body as LoginInput);
    res.status(200).json(successResponse('Login berhasil', data));
  } catch (error) {
    next(error);
  }
};
```

### Router (`auth.router.ts` — add route)

```typescript
authRouter.post('/login', validate(loginSchema), loginController);
```

---

## 2. JWT Auth Middleware

### File: `src/middlewares/auth.middleware.ts`

**`authenticate` middleware:**
1. Read `req.headers.authorization`
2. If missing or not matching `Bearer <token>` → `throw AppError('Token tidak ditemukan', 401)`
3. `jwt.verify(token, env.JWT_ACCESS_SECRET)` — if throws → `throw AppError('Token tidak valid', 401)`
4. Cast payload as `{ sub: string; role: Role }`
5. Set `req.user = { id: payload.sub, role: payload.role }`
6. Call `next()`

### TypeScript Augmentation: `src/types/express.d.ts`

```typescript
import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}
```

This gives `req.user` a proper type on all protected routes — no `any`.

---

## 3. Tests

### Unit: `auth.service.test.ts` — add `authService.login` describe block

| Case | Expected |
|---|---|
| Valid email + password, active user | Returns `{ user, accessToken, refreshToken }`, stores in Redis |
| Email not found | Throws `AppError(401, 'Email atau password salah')` |
| Wrong password | Throws `AppError(401, 'Email atau password salah')` |
| Inactive user (`isActive: false`) | Throws `AppError(401, 'Akun tidak aktif')` |
| bcrypt.compare receives correct args | Assert called with `(input.password, user.passwordHash)` |

### HTTP Integration: `src/__tests__/auth.login.http.test.ts` (new file)

Same mock setup as `auth.register.http.test.ts`.

| Case | HTTP status | Assertion |
|---|---|---|
| Valid login | 200 | `success: true`, user + tokens present, no `passwordHash` |
| Missing fields | 400 | `success: false`, errors array |
| Email not found | 401 | `success: false`, message matches |
| Wrong password | 401 | `success: false` |

### Unit: `src/__tests__/auth.middleware.test.ts` (new file)

| Case | Expected |
|---|---|
| Valid Bearer token | `req.user` set to `{ id, role }`, `next()` called |
| No Authorization header | `AppError(401)` passed to `next` |
| Malformed header (no Bearer) | `AppError(401)` passed to `next` |
| Expired token | `AppError(401)` passed to `next` |
| Tampered/invalid token | `AppError(401)` passed to `next` |

---

## Files Changed / Created

| Action | File |
|---|---|
| Modify | `src/modules/auth/auth.schema.ts` |
| Modify | `src/modules/auth/auth.service.ts` |
| Modify | `src/modules/auth/auth.controller.ts` |
| Modify | `src/modules/auth/auth.router.ts` |
| Create | `src/middlewares/auth.middleware.ts` |
| Create | `src/types/express.d.ts` |
| Modify | `src/modules/auth/__tests__/auth.service.test.ts` |
| Create | `src/__tests__/auth.login.http.test.ts` |
| Create | `src/__tests__/auth.middleware.test.ts` |

---

## Out of Scope

- `POST /auth/refresh` — separate task
- `POST /auth/logout` — separate task
- `GET /auth/me` — separate task
- `rbac.middleware.ts` (role-based access control) — separate task
- Multi-session support
