import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface TenantSeed {
  slug: string;
  nama: string;
  nomorRt: string;
  nomorRw: string;
  kelurahan: string;
  kecamatan: string;
  adminEmail: string;
  adminName: string;
  adminPhone: string;
}

const TENANTS: TenantSeed[] = [
  {
    slug: "rt01-rw01-kelurahan-contoh",
    nama: "RT 01 RW 01 Kelurahan Contoh",
    nomorRt: "01",
    nomorRw: "01",
    kelurahan: "Kelurahan Contoh",
    kecamatan: "Kecamatan Contoh",
    adminEmail: "admin@kampungku.id",
    adminName: "Administrator RT 01",
    adminPhone: "081200000000",
  },
  {
    slug: "rt02-rw03-mawar",
    nama: "RT 02 RW 03 Kel. Mawar",
    nomorRt: "02",
    nomorRw: "03",
    kelurahan: "Kelurahan Mawar",
    kecamatan: "Kecamatan Melati",
    adminEmail: "admin.mawar@kampungku.id",
    adminName: "Administrator RT 02 Mawar",
    adminPhone: "081200000100",
  },
];

const JENIS_IURAN = [
  { nama: "Iuran RT", jumlah: 10000, keterangan: "Iuran rutin bulanan RT" },
  { nama: "Iuran Keamanan", jumlah: 15000, keterangan: "Iuran untuk biaya siskamling" },
  { nama: "Iuran Sampah", jumlah: 5000, keterangan: "Iuran pengangkutan sampah" },
];

async function upsertUser(args: {
  email: string;
  name: string;
  phone: string;
  password: string;
  role: Role;
  tenantId: string | null;
}) {
  const passwordHash = await bcrypt.hash(args.password, 12);
  return prisma.user.upsert({
    where: { email: args.email },
    update: { tenantId: args.tenantId, role: args.role },
    create: {
      name: args.name,
      email: args.email,
      phone: args.phone,
      passwordHash,
      role: args.role,
      tenantId: args.tenantId,
      isActive: true,
    },
  });
}

async function main() {
  console.log("🌱 Memulai seeding database KampungKu (multi-tenant)...");

  // 1. SUPER_ADMIN platform (tenantId = null)
  const superAdmin = await upsertUser({
    email: "super@kampungku.id",
    name: "Super Admin Platform",
    phone: "081200000999",
    password: "SuperAdmin1234!",
    role: "SUPER_ADMIN",
    tenantId: null,
  });
  console.log(`✅ SUPER_ADMIN: ${superAdmin.email}`);

  // 2. Setiap tenant + admin + jenis iuran
  for (const t of TENANTS) {
    const tenant = await prisma.rT.upsert({
      where: { slug: t.slug },
      update: { nama: t.nama, kelurahan: t.kelurahan, kecamatan: t.kecamatan, isActive: true },
      create: {
        slug: t.slug,
        nama: t.nama,
        nomorRt: t.nomorRt,
        nomorRw: t.nomorRw,
        kelurahan: t.kelurahan,
        kecamatan: t.kecamatan,
        isActive: true,
      },
    });
    console.log(`✅ Tenant: ${tenant.nama} (slug: ${tenant.slug})`);

    await upsertUser({
      email: t.adminEmail,
      name: t.adminName,
      phone: t.adminPhone,
      password: "Admin1234!",
      role: "ADMIN",
      tenantId: tenant.id,
    });
    console.log(`   ↳ ADMIN: ${t.adminEmail}`);

    for (const ji of JENIS_IURAN) {
      await prisma.jenisIuran.upsert({
        where: { tenantId_nama: { tenantId: tenant.id, nama: ji.nama } },
        update: { jumlah: ji.jumlah, keterangan: ji.keterangan, isAktif: true },
        create: {
          tenantId: tenant.id,
          nama: ji.nama,
          jumlah: ji.jumlah,
          keterangan: ji.keterangan,
          isAktif: true,
        },
      });
    }
    console.log(`   ↳ ${JENIS_IURAN.length} jenis iuran`);
  }

  // 3. Legacy users existing — pastikan ter-link ke tenant pertama (kompat dengan data lama)
  const firstTenant = await prisma.rT.findUnique({ where: { slug: TENANTS[0].slug } });
  if (firstTenant) {
    await upsertUser({
      email: "ketua@kampungku.id",
      name: "Ketua RT 01",
      phone: "081200000001",
      password: "Ketua1234!",
      role: "KETUA_RT",
      tenantId: firstTenant.id,
    });
    await upsertUser({
      email: "bendahara@kampungku.id",
      name: "Bendahara RT 01",
      phone: "081200000002",
      password: "Bendahara1234!",
      role: "BENDAHARA",
      tenantId: firstTenant.id,
    });

    const wargaUser = await upsertUser({
      email: "budi@kampungku.id",
      name: "Budi Santoso",
      phone: "081234567890",
      password: "Warga1234!",
      role: "WARGA",
      tenantId: firstTenant.id,
    });

    const existingWarga = await prisma.warga.findUnique({ where: { userId: wargaUser.id } });
    if (!existingWarga) {
      await prisma.warga.create({
        data: {
          userId: wargaUser.id,
          nik: "3201012501900001",
          noKk: "3201011234567890",
          alamat: "Jl. Contoh No. 1, RT 01 / RW 01",
          rtId: firstTenant.id,
          statusTinggal: "TETAP",
          tglMasuk: new Date("2020-01-01"),
        },
      });
    }
    console.log(`✅ Legacy users + warga di tenant ${firstTenant.slug}`);
  }

  console.log("\n🎉 Seeding selesai!");
  console.log("─────────────────────────────────────────");
  console.log("Akun platform:");
  console.log("  SUPER_ADMIN → super@kampungku.id          / SuperAdmin1234!");
  console.log("Akun tenant RT 01 (Kelurahan Contoh):");
  console.log("  ADMIN       → admin@kampungku.id          / Admin1234!");
  console.log("  KETUA_RT    → ketua@kampungku.id          / Ketua1234!");
  console.log("  BENDAHARA   → bendahara@kampungku.id      / Bendahara1234!");
  console.log("  WARGA       → budi@kampungku.id           / Warga1234!");
  console.log("Akun tenant RT 02 (Kelurahan Mawar):");
  console.log("  ADMIN       → admin.mawar@kampungku.id    / Admin1234!");
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
