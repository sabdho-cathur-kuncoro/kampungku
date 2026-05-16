# Auth Register — Design Spec

**Date:** 2026-05-16  
**Scope:** `POST /api/v1/auth/register` — buat akun User (role WARGA) + auto-issue JWT tokens  
**Repo path:** `kampungku-api/src/`

---

## Dependencies to Install

```bash
npm install ioredis
npm install -D @types/cors
```

`ioredis` belum ada di `package.json` (ioredis v5+ bundled types, tidak perlu `@types/ioredis`). `@types/cors` juga belum ada.

---

## Context

Codebase belum punya module apapun. `app.ts` minimal (static files only), `server.ts` kosong. Prisma schema + seed sudah ada. Semua dependencies tersedia (express, prisma, bcryptjs, jsonwebtoken, zod, ioredis/redis, dll).

Register hanya buat `User` — data Warga (NIK, alamat, RT) dikelola admin terpisah via `POST /api/v1/warga`.

---

## Endpoint

```
POST /api/v1/auth/register
```

**Request body:**
```json
{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "Min8Huruf1!",
  "phone": "081234567890"
}
```

**Validasi (Zod):**
- `name` — string, min 2, max 100
- `email` — email valid
- `password` — min 8 char, harus ada huruf + angka
- `phone` — opsional, max 15 char

**Response 201:**
```json
{
  "success": true,
  "message": "Registrasi berhasil",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "phone": "081234567890",
      "role": "WARGA"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Error cases:**
- `400` — validasi Zod gagal
- `409` — email sudah terdaftar
- `500` — server error

---

## Logic Flow

1. Validate body → Zod middleware (400 jika gagal)
2. Cek email di DB → 409 jika ada
3. `bcrypt.hash(password, 12)`
4. `prisma.user.create()` — role default `WARGA`, isActive `true`
5. Generate access token: JWT signed `JWT_ACCESS_SECRET`, expire `15m`, payload `{ sub: user.id, role }`
6. Generate refresh token: JWT signed `JWT_REFRESH_SECRET`, expire `7d`
7. Simpan refresh token di Redis: key `refresh:<userId>`, value token, TTL 7 hari
8. Return 201 `{ user (tanpa passwordHash), accessToken, refreshToken }`

---

## Files

### Baru dibuat
| File | Isi |
|---|---|
| `src/config/database.ts` | Prisma client singleton |
| `src/config/env.ts` | Zod env validation (PORT, DATABASE_URL, REDIS_URL, JWT secrets) |
| `src/config/redis.ts` | Redis client singleton (ioredis) |
| `src/utils/response.ts` | `successResponse()` + `errorResponse()` helpers |
| `src/middlewares/validate.middleware.ts` | Zod request validator middleware |
| `src/middlewares/errorHandler.ts` | Global error handler |
| `src/modules/auth/auth.schema.ts` | `registerSchema` (Zod) |
| `src/modules/auth/auth.service.ts` | `register()` — DB + Redis + JWT logic |
| `src/modules/auth/auth.controller.ts` | `registerController` — HTTP handler |
| `src/modules/auth/auth.router.ts` | Router mount `POST /register` |

### Diupdate
| File | Perubahan |
|---|---|
| `src/app.ts` | Tambah JSON middleware, helmet, cors, morgan, rate limit, mount `/api/v1/auth` |
| `src/server.ts` | Import app, listen port dari env |

---

## Architecture Notes

- Controller ikut pola CLAUDE.md: `async/await` + `try/catch` + `next(error)`
- Semua DB call lewat Service layer — controller hanya handle HTTP
- `passwordHash` tidak pernah disertakan di response (manual select fields)
- Rate limiting di level app untuk semua route (express-rate-limit sudah terpasang)
- Refresh token disimpan di Redis bukan DB untuk performa dan kemudahan invalidasi

---

## Out of Scope

- Login, refresh token, logout, `/auth/me` — endpoint terpisah
- Registrasi oleh Admin (gunakan `POST /api/v1/warga`)
- Email verification — tidak ada di CLAUDE.md
