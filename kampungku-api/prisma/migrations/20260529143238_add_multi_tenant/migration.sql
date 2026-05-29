-- Multi-tenant migration
-- Strategy: add columns as NULLABLE → backfill from existing RT → set NOT NULL → add constraints.

-- ============================================================
-- 1. Enum: tambah SUPER_ADMIN
-- ============================================================
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- ============================================================
-- 2. Drop indexes lama yang konflik dengan composite unique baru
-- ============================================================
DROP INDEX "jenis_iuran_nama_key";
DROP INDEX "rt_rw_nomor_rt_nomor_rw_key";
DROP INDEX "warga_nik_key";

-- ============================================================
-- 3. RT (rt_rw) — tambah field tenant baru
--    Add as NULLABLE/with default first, backfill, then SET NOT NULL.
-- ============================================================
ALTER TABLE "rt_rw"
  ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  ADD COLUMN "nama"       VARCHAR(150),
  ADD COLUMN "slug"       VARCHAR(80),
  ADD COLUMN "updated_at" TIMESTAMP(3);

-- Backfill nama, slug, updated_at untuk RT existing
UPDATE "rt_rw"
SET
  "nama"       = CONCAT('RT ', "nomor_rt", ' RW ', "nomor_rw", ' ', "kelurahan"),
  "slug"       = LOWER(CONCAT('rt', "nomor_rt", '-rw', "nomor_rw", '-', REGEXP_REPLACE("kelurahan", '\s+', '-', 'g'))),
  "updated_at" = CURRENT_TIMESTAMP
WHERE "nama" IS NULL;

ALTER TABLE "rt_rw"
  ALTER COLUMN "nama"       SET NOT NULL,
  ALTER COLUMN "slug"       SET NOT NULL,
  ALTER COLUMN "updated_at" SET NOT NULL;

-- ============================================================
-- 4. users — tambah tenant_id (nullable, SUPER_ADMIN = null)
--    Backfill semua user existing ke tenant RT pertama (asumsi single-tenant lama).
-- ============================================================
ALTER TABLE "users" ADD COLUMN "tenant_id" TEXT;

UPDATE "users"
SET "tenant_id" = (SELECT "id" FROM "rt_rw" ORDER BY "nomor_rw", "nomor_rt" LIMIT 1)
WHERE "tenant_id" IS NULL;

-- ============================================================
-- 5. jenis_iuran — tambah tenant_id NOT NULL
--    Backfill ke RT pertama.
-- ============================================================
ALTER TABLE "jenis_iuran" ADD COLUMN "tenant_id" TEXT;

UPDATE "jenis_iuran"
SET "tenant_id" = (SELECT "id" FROM "rt_rw" ORDER BY "nomor_rw", "nomor_rt" LIMIT 1)
WHERE "tenant_id" IS NULL;

ALTER TABLE "jenis_iuran" ALTER COLUMN "tenant_id" SET NOT NULL;

-- ============================================================
-- 6. permohonan_surat — tambah tenant_id NOT NULL
--    Backfill via JOIN warga.rt_id. Aman karena tidak null.
-- ============================================================
ALTER TABLE "permohonan_surat" ADD COLUMN "tenant_id" TEXT;

UPDATE "permohonan_surat" ps
SET "tenant_id" = w."rt_id"
FROM "warga" w
WHERE ps."warga_id" = w."id" AND ps."tenant_id" IS NULL;

ALTER TABLE "permohonan_surat" ALTER COLUMN "tenant_id" SET NOT NULL;

-- ============================================================
-- 7. pengaduan — tambah tenant_id NOT NULL
--    Backfill via warga.rt_id untuk pengaduan non-anonim;
--    anonim (warga_id NULL) → RT pertama (legacy data; bisa edit manual nanti).
-- ============================================================
ALTER TABLE "pengaduan" ADD COLUMN "tenant_id" TEXT;

UPDATE "pengaduan" p
SET "tenant_id" = w."rt_id"
FROM "warga" w
WHERE p."warga_id" = w."id" AND p."tenant_id" IS NULL;

UPDATE "pengaduan"
SET "tenant_id" = (SELECT "id" FROM "rt_rw" ORDER BY "nomor_rw", "nomor_rt" LIMIT 1)
WHERE "tenant_id" IS NULL;

ALTER TABLE "pengaduan" ALTER COLUMN "tenant_id" SET NOT NULL;

-- ============================================================
-- 8. refresh_tokens — tambah tenant_id nullable
--    Backfill berdasarkan user.tenant_id.
-- ============================================================
ALTER TABLE "refresh_tokens" ADD COLUMN "tenant_id" TEXT;

UPDATE "refresh_tokens" rt
SET "tenant_id" = u."tenant_id"
FROM "users" u
WHERE rt."user_id" = u."id" AND rt."tenant_id" IS NULL;

-- ============================================================
-- 9. Indexes baru
-- ============================================================
CREATE INDEX "jenis_iuran_tenant_id_idx"       ON "jenis_iuran"("tenant_id");
CREATE UNIQUE INDEX "jenis_iuran_tenant_id_nama_key" ON "jenis_iuran"("tenant_id", "nama");
CREATE INDEX "pengaduan_tenant_id_idx"          ON "pengaduan"("tenant_id");
CREATE INDEX "permohonan_surat_tenant_id_idx"   ON "permohonan_surat"("tenant_id");
CREATE INDEX "refresh_tokens_tenant_id_idx"     ON "refresh_tokens"("tenant_id");
CREATE UNIQUE INDEX "rt_rw_slug_key"            ON "rt_rw"("slug");
CREATE INDEX "users_tenant_id_idx"              ON "users"("tenant_id");
CREATE INDEX "warga_rt_id_idx"                  ON "warga"("rt_id");
CREATE UNIQUE INDEX "warga_rt_id_nik_key"       ON "warga"("rt_id", "nik");

-- ============================================================
-- 10. Foreign keys baru
-- ============================================================
ALTER TABLE "users"
  ADD CONSTRAINT "users_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "rt_rw"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "jenis_iuran"
  ADD CONSTRAINT "jenis_iuran_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "rt_rw"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "permohonan_surat"
  ADD CONSTRAINT "permohonan_surat_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "rt_rw"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pengaduan"
  ADD CONSTRAINT "pengaduan_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "rt_rw"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "rt_rw"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
