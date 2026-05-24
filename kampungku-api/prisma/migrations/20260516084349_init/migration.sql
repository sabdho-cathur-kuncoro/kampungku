-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'KETUA_RT', 'BENDAHARA', 'SEKRETARIS', 'WARGA');

-- CreateEnum
CREATE TYPE "StatusTinggal" AS ENUM ('TETAP', 'KONTRAK', 'KOST', 'PINDAH');

-- CreateEnum
CREATE TYPE "StatusIuran" AS ENUM ('BELUM_BAYAR', 'MENUNGGU_VERIFIKASI', 'LUNAS');

-- CreateEnum
CREATE TYPE "StatusSurat" AS ENUM ('DIAJUKAN', 'DIPROSES', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "StatusPengaduan" AS ENUM ('BARU', 'DIPROSES', 'SELESAI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "KategoriPengumuman" AS ENUM ('UMUM', 'KEGIATAN', 'KEUANGAN', 'DARURAT');

-- CreateEnum
CREATE TYPE "JenisSurat" AS ENUM ('DOMISILI', 'KETERANGAN_TIDAK_MAMPU', 'KETERANGAN_USAHA', 'PENGANTAR_KTP', 'PENGANTAR_KK', 'LAINNYA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(15),
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WARGA',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warga" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nik" CHAR(16) NOT NULL,
    "no_kk" CHAR(16) NOT NULL,
    "alamat" TEXT NOT NULL,
    "rt_id" TEXT NOT NULL,
    "status_tinggal" "StatusTinggal" NOT NULL DEFAULT 'TETAP',
    "tgl_masuk" DATE,
    "foto_profil_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anggota_keluarga" (
    "id" TEXT NOT NULL,
    "warga_id" TEXT NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "nik" CHAR(16) NOT NULL,
    "hubungan" VARCHAR(30) NOT NULL,
    "tgl_lahir" DATE NOT NULL,
    "jenis_kelamin" VARCHAR(10) NOT NULL,
    "pekerjaan" VARCHAR(100),
    "pendidikan" VARCHAR(50),

    CONSTRAINT "anggota_keluarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rt_rw" (
    "id" TEXT NOT NULL,
    "nomor_rt" VARCHAR(5) NOT NULL,
    "nomor_rw" VARCHAR(5) NOT NULL,
    "kelurahan" VARCHAR(100) NOT NULL,
    "kecamatan" VARCHAR(100) NOT NULL,

    CONSTRAINT "rt_rw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jenis_iuran" (
    "id" TEXT NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "jumlah" DECIMAL(10,2) NOT NULL,
    "keterangan" TEXT,
    "is_aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "jenis_iuran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iuran_tagihan" (
    "id" TEXT NOT NULL,
    "warga_id" TEXT NOT NULL,
    "jenis_iuran_id" TEXT NOT NULL,
    "rt_id" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jumlah" DECIMAL(10,2) NOT NULL,
    "status" "StatusIuran" NOT NULL DEFAULT 'BELUM_BAYAR',
    "tgl_bayar" TIMESTAMP(3),
    "verified_by" TEXT,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iuran_tagihan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengumuman" (
    "id" TEXT NOT NULL,
    "judul" VARCHAR(200) NOT NULL,
    "konten" TEXT NOT NULL,
    "kategori" "KategoriPengumuman" NOT NULL DEFAULT 'UMUM',
    "author_id" TEXT NOT NULL,
    "rt_id" TEXT NOT NULL,
    "tgl_mulai" TIMESTAMP(3) NOT NULL,
    "tgl_selesai" TIMESTAMP(3),
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pengumuman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permohonan_surat" (
    "id" TEXT NOT NULL,
    "warga_id" TEXT NOT NULL,
    "jenis_surat" "JenisSurat" NOT NULL,
    "keperluan" TEXT NOT NULL,
    "status" "StatusSurat" NOT NULL DEFAULT 'DIAJUKAN',
    "no_surat" TEXT,
    "approved_by" TEXT,
    "alasan_tolak" TEXT,
    "tgl_diajukan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tgl_diproses" TIMESTAMP(3),

    CONSTRAINT "permohonan_surat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengaduan" (
    "id" TEXT NOT NULL,
    "warga_id" TEXT,
    "judul" VARCHAR(200) NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "is_anonim" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusPengaduan" NOT NULL DEFAULT 'BARU',
    "tanggapan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengaduan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "warga_user_id_key" ON "warga"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "warga_nik_key" ON "warga"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "rt_rw_nomor_rt_nomor_rw_key" ON "rt_rw"("nomor_rt", "nomor_rw");

-- CreateIndex
CREATE UNIQUE INDEX "iuran_tagihan_warga_id_jenis_iuran_id_bulan_tahun_key" ON "iuran_tagihan"("warga_id", "jenis_iuran_id", "bulan", "tahun");

-- CreateIndex
CREATE UNIQUE INDEX "permohonan_surat_no_surat_key" ON "permohonan_surat"("no_surat");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- AddForeignKey
ALTER TABLE "warga" ADD CONSTRAINT "warga_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warga" ADD CONSTRAINT "warga_rt_id_fkey" FOREIGN KEY ("rt_id") REFERENCES "rt_rw"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anggota_keluarga" ADD CONSTRAINT "anggota_keluarga_warga_id_fkey" FOREIGN KEY ("warga_id") REFERENCES "warga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iuran_tagihan" ADD CONSTRAINT "iuran_tagihan_warga_id_fkey" FOREIGN KEY ("warga_id") REFERENCES "warga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iuran_tagihan" ADD CONSTRAINT "iuran_tagihan_jenis_iuran_id_fkey" FOREIGN KEY ("jenis_iuran_id") REFERENCES "jenis_iuran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iuran_tagihan" ADD CONSTRAINT "iuran_tagihan_rt_id_fkey" FOREIGN KEY ("rt_id") REFERENCES "rt_rw"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengumuman" ADD CONSTRAINT "pengumuman_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengumuman" ADD CONSTRAINT "pengumuman_rt_id_fkey" FOREIGN KEY ("rt_id") REFERENCES "rt_rw"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permohonan_surat" ADD CONSTRAINT "permohonan_surat_warga_id_fkey" FOREIGN KEY ("warga_id") REFERENCES "warga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permohonan_surat" ADD CONSTRAINT "permohonan_surat_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengaduan" ADD CONSTRAINT "pengaduan_warga_id_fkey" FOREIGN KEY ("warga_id") REFERENCES "warga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
