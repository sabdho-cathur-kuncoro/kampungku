import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding database KampungKu...");

  // ─── 1. Buat data RT/RW ───────────────────────────────────────────────────
  const rt = await prisma.rT.upsert({
    where: { nomorRt_nomorRw: { nomorRt: "01", nomorRw: "01" } },
    update: {},
    create: {
      nomorRt: "01",
      nomorRw: "01",
      kelurahan: "Kelurahan Contoh",
      kecamatan: "Kecamatan Contoh",
    },
  });
  console.log(`✅ RT dibuat: RT ${rt.nomorRt} / RW ${rt.nomorRw}`);

  // ─── 2. Buat akun Admin ───────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Admin1234!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@kampungku.id" },
    update: {},
    create: {
      name: "Administrator",
      email: "admin@kampungku.id",
      phone: "081200000000",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`✅ Admin dibuat: ${admin.email}`);

  // ─── 3. Buat akun Ketua RT ────────────────────────────────────────────────
  const ketuaHash = await bcrypt.hash("Ketua1234!", 12);

  const ketua = await prisma.user.upsert({
    where: { email: "ketua@kampungku.id" },
    update: {},
    create: {
      name: "Ketua RT 01",
      email: "ketua@kampungku.id",
      phone: "081200000001",
      passwordHash: ketuaHash,
      role: "KETUA_RT",
      isActive: true,
    },
  });
  console.log(`✅ Ketua RT dibuat: ${ketua.email}`);

  // ─── 4. Buat akun Bendahara ───────────────────────────────────────────────
  const bendaharaHash = await bcrypt.hash("Bendahara1234!", 12);

  const bendahara = await prisma.user.upsert({
    where: { email: "bendahara@kampungku.id" },
    update: {},
    create: {
      name: "Bendahara RT 01",
      email: "bendahara@kampungku.id",
      phone: "081200000002",
      passwordHash: bendaharaHash,
      role: "BENDAHARA",
      isActive: true,
    },
  });
  console.log(`✅ Bendahara dibuat: ${bendahara.email}`);

  // ─── 5. Buat Jenis Iuran ──────────────────────────────────────────────────
  const jenisIuranData = [
    {
      nama: "Iuran RT",
      jumlah: 10000,
      keterangan: "Iuran rutin bulanan RT",
    },
    {
      nama: "Iuran Keamanan",
      jumlah: 15000,
      keterangan: "Iuran untuk biaya siskamling",
    },
    {
      nama: "Iuran Sampah",
      jumlah: 5000,
      keterangan: "Iuran pengangkutan sampah",
    },
  ];

  for (const data of jenisIuranData) {
    const jenis = await prisma.jenisIuran.upsert({
      where: { nama: data.nama },
      update: {},
      create: {
        nama: data.nama,
        jumlah: data.jumlah,
        keterangan: data.keterangan,
        isAktif: true,
      },
    });
    console.log(
      `✅ Jenis iuran dibuat: ${jenis.nama} (Rp ${Number(jenis.jumlah).toLocaleString("id-ID")})`,
    );
  }

  // ─── 6. Buat warga contoh ─────────────────────────────────────────────────
  const wargaHash = await bcrypt.hash("Warga1234!", 12);

  const wargaUser = await prisma.user.upsert({
    where: { email: "budi@kampungku.id" },
    update: {},
    create: {
      name: "Budi Santoso",
      email: "budi@kampungku.id",
      phone: "081234567890",
      passwordHash: wargaHash,
      role: "WARGA",
      isActive: true,
    },
  });

  await prisma.warga.upsert({
    where: { userId: wargaUser.id },
    update: {},
    create: {
      userId: wargaUser.id,
      nik: "3201012501900001",
      noKk: "3201011234567890",
      alamat: "Jl. Contoh No. 1, RT 01 / RW 01",
      rtId: rt.id,
      statusTinggal: "TETAP",
      tglMasuk: new Date("2020-01-01"),
    },
  });
  console.log(`✅ Warga contoh dibuat: ${wargaUser.name}`);

  console.log("\n🎉 Seeding selesai!");
  console.log("─────────────────────────────────────────");
  console.log("Akun yang tersedia:");
  console.log("  Admin     → admin@kampungku.id      / Admin1234!");
  console.log("  Ketua RT  → ketua@kampungku.id      / Ketua1234!");
  console.log("  Bendahara → bendahara@kampungku.id  / Bendahara1234!");
  console.log("  Warga     → budi@kampungku.id       / Warga1234!");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seeding gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
