# Auth Refresh, Logout, and /me — Design Spec

**Date:** 2026-05-24
**Scope:** `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
**Approach:** Mirror existing register/login pattern. No new abstractions.

---

## 1. POST /auth/refresh

### Schema (`auth.schema.ts` — append)

```typescript
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token wajib diisi'),
  }),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
```

### Service (`authService.refresh(token: string)`)

Steps:
1. `jwt.verify(token, env.JWT_REFRESH_SECRET)` → throw `AppError('Refresh token tidak valid', 401)` if invalid/expired
2. Extract `sub` (userId) from payload
3. `redis.get('refresh:{userId}')` → throw `AppError('Sesi tidak ditemukan', 401)` if null
4. If stored token does not match `token` → throw `AppError('Refresh token tidak valid', 401)` (replay protection / old rotation)
5. `prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })` → throw `AppError('User tidak ditemukan', 401)` if null
6. Sign new `accessToken`: `{ sub: userId, role: user.role }`, expires `env.JWT_ACCESS_EXPIRES`
7. Sign new `refreshToken`: `{ sub: userId }`, expires `env.JWT_REFRESH_EXPIRES`
8. `redis.set('refresh:{userId}', newRefreshToken, 'EX', 604800)` — overwrites old (rotation)
9. Return `{ accessToken, refreshToken }`

### Controller + Router

- `refreshController`: async try/catch, returns 200 with `successResponse('Token diperbarui', data)`
- Route: `POST /refresh` with `validate(refreshTokenSchema)` + `refreshController`

---

## 2. POST /auth/logout

### Schema (`auth.schema.ts` — append)

```typescript
export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token wajib diisi'),
  }),
});

export type LogoutInput = z.infer<typeof logoutSchema>['body'];
```

### Service (`authService.logout(token: string)`)

Steps:
1. Try `jwt.verify(token, env.JWT_REFRESH_SECRET)` to extract `sub` (userId)
2. If valid, call `redis.del('refresh:{userId}')`
3. If JWT throws (expired, tampered) → do nothing (session already expired/invalid — still return success)
4. Return void

**Rationale for best-effort delete:** Logout should never fail from the client's perspective. If a token is expired, the session is already effectively gone. Silent success prevents leaking whether a session exists.

### Controller + Router

- `logoutController`: async try/catch, returns 200 with `successResponse('Logout berhasil')`
- Route: `POST /logout` with `validate(logoutSchema)` + `logoutController`

---

## 3. GET /auth/me

### No Schema

No request body. Route protected by `authenticate` middleware which sets `req.user = { id, role }`.

### Service (`authService.me(userId: string)`)

Steps:
1. `prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true } })`
2. If null → throw `AppError('User tidak ditemukan', 404)` (edge case: user deleted after token issued)
3. Return user object

### Controller + Router

- `meController`: async try/catch, calls `authService.me(req.user!.id)`, returns 200 with `successResponse('Data berhasil diambil', data)`
- Route: `GET /me` with `authenticate` + `meController` (no Zod schema)

---

## 4. Tests

### Service Unit Tests (add to `auth.service.test.ts`)

#### `authService.refresh`

| Case | Expected |
|---|---|
| Valid token, Redis match | Returns new accessToken + refreshToken; Redis updated with new token |
| Invalid/expired JWT | Throws `AppError(401, 'Refresh token tidak valid')` |
| Redis returns null (no session) | Throws `AppError(401, 'Sesi tidak ditemukan')` |
| Token mismatch (replay attack) | Throws `AppError(401, 'Refresh token tidak valid')` |

#### `authService.logout`

| Case | Expected |
|---|---|
| Valid token | `redis.del` called with `'refresh:{userId}'` |
| Invalid/expired JWT | `redis.del` NOT called; no error thrown |

#### `authService.me`

| Case | Expected |
|---|---|
| User found | Returns `{ id, name, email, phone, role, isActive, createdAt }` — no `passwordHash` |
| User not found | Throws `AppError(404, 'User tidak ditemukan')` |

### HTTP Integration Tests (new files)

**`src/__tests__/auth.refresh.http.test.ts`**

| Case | HTTP status |
|---|---|
| Valid refresh token | 200, new accessToken + refreshToken |
| Missing refreshToken field | 400 |
| Invalid JWT | 401 |
| Redis miss | 401 |

**`src/__tests__/auth.logout.http.test.ts`**

| Case | HTTP status |
|---|---|
| Valid refresh token | 200, 'Logout berhasil' |
| Missing refreshToken field | 400 |

**`src/__tests__/auth.me.http.test.ts`**

| Case | HTTP status |
|---|---|
| Valid Bearer access token | 200, user profile |
| No Authorization header | 401 |
| Expired/invalid access token | 401 |

---

## 5. Files Changed / Created

| Action | File |
|---|---|
| Modify | `src/modules/auth/auth.schema.ts` |
| Modify | `src/modules/auth/auth.service.ts` |
| Modify | `src/modules/auth/auth.controller.ts` |
| Modify | `src/modules/auth/auth.router.ts` |
| Modify | `src/modules/auth/__tests__/auth.service.test.ts` |
| Create | `src/__tests__/auth.refresh.http.test.ts` |
| Create | `src/__tests__/auth.logout.http.test.ts` |
| Create | `src/__tests__/auth.me.http.test.ts` |

---

## 6. Out of Scope

- `rbac.middleware.ts` — separate task
- Multi-session / device management
- Refresh token blacklist (Redis key deletion is sufficient for single-session model)
- Token revocation on password change
