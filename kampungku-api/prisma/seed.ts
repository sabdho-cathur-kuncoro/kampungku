import { PrismaClient, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Static seed data ─────────────────────────────────────────────────────────

const JENIS_IURAN = [
  { nama: 'Iuran RT', jumlah: 10000, keterangan: 'Iuran rutin bulanan RT' },
  { nama: 'Iuran Keamanan', jumlah: 15000, keterangan: 'Biaya operasional siskamling' },
  { nama: 'Iuran Sampah', jumlah: 5000, keterangan: 'Biaya pengangkutan sampah' },
];

interface TenantConfig {
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

const TENANTS: TenantConfig[] = [
  {
    slug: 'rt01-rw01-sukamaju',
    nama: 'RT 01 RW 01 Kel. Sukamaju',
    nomorRt: '01',
    nomorRw: '01',
    kelurahan: 'Sukamaju',
    kecamatan: 'Cimanggis',
    adminEmail: 'admin.sukamaju@kampungku.id',
    adminName: 'Admin RT 01 Sukamaju',
    adminPhone: '081200000010',
  },
  {
    slug: 'rt02-rw03-mawar',
    nama: 'RT 02 RW 03 Kel. Mawar',
    nomorRt: '02',
    nomorRw: '03',
    kelurahan: 'Mawar',
    kecamatan: 'Beji',
    adminEmail: 'admin.mawar@kampungku.id',
    adminName: 'Admin RT 02 Mawar',
    adminPhone: '081200000020',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      email: args.email,
      name: args.name,
      phone: args.phone,
      passwordHash,
      role: args.role,
      tenantId: args.tenantId,
      isActive: true,
    },
  });
}

async function upsertWarga(args: {
  userId: string;
  nik: string;
  noKk: string;
  alamat: string;
  rtId: string;
}) {
  return prisma.warga.upsert({
    where: { userId: args.userId },
    update: {},
    create: {
      userId: args.userId,
      nik: args.nik,
      noKk: args.noKk,
      alamat: args.alamat,
      rtId: args.rtId,
      statusTinggal: 'TETAP',
      tglMasuk: new Date('2020-01-01'),
    },
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Memulai seeding database KampungKu...\n');

  // 1. SUPER_ADMIN platform (tenantId = null)
  const superAdmin = await upsertUser({
    email: 'super@kampungku.id',
    name: 'Super Admin Platform',
    phone: '081200000999',
    password: 'SuperAdmin1234!',
    role: 'SUPER_ADMIN',
    tenantId: null,
  });
  console.log(`[OK] SUPER_ADMIN: ${superAdmin.email}`);

  // 2. Seed tiap tenant
  for (const cfg of TENANTS) {
    console.log(`\n--- Tenant: ${cfg.nama} ---`);

    const rt = await prisma.rT.upsert({
      where: { slug: cfg.slug },
      update: {
        nama: cfg.nama,
        nomorRt: cfg.nomorRt,
        nomorRw: cfg.nomorRw,
        kelurahan: cfg.kelurahan,
        kecamatan: cfg.kecamatan,
        isActive: true,
      },
      create: {
        slug: cfg.slug,
        nama: cfg.nama,
        nomorRt: cfg.nomorRt,
        nomorRw: cfg.nomorRw,
        kelurahan: cfg.kelurahan,
        kecamatan: cfg.kecamatan,
        isActive: true,
      },
    });
    console.log(`[OK] RT: ${rt.nama} (id: ${rt.id})`);

    const admin = await upsertUser({
      email: cfg.adminEmail,
      name: cfg.adminName,
      phone: cfg.adminPhone,
      password: 'Admin1234!',
      role: 'ADMIN',
      tenantId: rt.id,
    });
    console.log(`[OK] ADMIN: ${admin.email}`);

    for (const ji of JENIS_IURAN) {
      await prisma.jenisIuran.upsert({
        where: { tenantId_nama: { tenantId: rt.id, nama: ji.nama } },
        update: { jumlah: ji.jumlah, keterangan: ji.keterangan, isAktif: true },
        create: { tenantId: rt.id, ...ji, isAktif: true },
      });
    }
    console.log(`[OK] ${JENIS_IURAN.length} jenis iuran`);

    const existingPengumuman = await prisma.pengumuman.findFirst({ where: { rtId: rt.id } });
    if (!existingPengumuman) {
      await prisma.pengumuman.createMany({
        data: [
          {
            rtId: rt.id,
            authorId: admin.id,
            judul: 'Selamat Datang di KampungKu',
            konten:
              'Aplikasi KampungKu hadir untuk mempermudah administrasi dan komunikasi warga. Silakan eksplorasi fitur yang tersedia.',
            kategori: 'UMUM',
            tglMulai: new Date('2026-01-01'),
            isPinned: true,
          },
          {
            rtId: rt.id,
            authorId: admin.id,
            judul: 'Jadwal Kerja Bakti Bulan Ini',
            konten:
              'Kerja bakti rutin dilaksanakan setiap Minggu pertama pukul 07.00 WIB. Kehadiran warga sangat diharapkan.',
            kategori: 'KEGIATAN',
            tglMulai: new Date('2026-05-01'),
            tglSelesai: new Date('2026-05-31'),
            isPinned: false,
          },
        ],
      });
      console.log('[OK] 2 pengumuman contoh');
    }
  }

  // 3. Additional roles + warga di Tenant A (Sukamaju)
  const tenantA = await prisma.rT.findUniqueOrThrow({ where: { slug: 'rt01-rw01-sukamaju' } });
  console.log(`\n--- Role tambahan & warga di ${tenantA.slug} ---`);

  const ketuaRT = await upsertUser({
    email: 'ketua@kampungku.id',
    name: 'Pak Suharto',
    phone: '081200000001',
    password: 'Ketua1234!',
    role: 'KETUA_RT',
    tenantId: tenantA.id,
  });
  const bendahara = await upsertUser({
    email: 'bendahara@kampungku.id',
    name: 'Bu Sari Dewi',
    phone: '081200000002',
    password: 'Bendahara1234!',
    role: 'BENDAHARA',
    tenantId: tenantA.id,
  });
  const sekretaris = await upsertUser({
    email: 'sekretaris@kampungku.id',
    name: 'Pak Agus Wahyu',
    phone: '081200000003',
    password: 'Sekretaris1234!',
    role: 'SEKRETARIS',
    tenantId: tenantA.id,
  });
  console.log('[OK] KETUA_RT, BENDAHARA, SEKRETARIS');

  // Warga profiles for role users
  await upsertWarga({ userId: ketuaRT.id, nik: '3201010101500010', noKk: '3201010000000010', alamat: 'Jl. Mawar No. 1', rtId: tenantA.id });
  await upsertWarga({ userId: bendahara.id, nik: '3201016507680020', noKk: '3201010000000020', alamat: 'Jl. Mawar No. 2', rtId: tenantA.id });
  await upsertWarga({ userId: sekretaris.id, nik: '3201010202750030', noKk: '3201010000000030', alamat: 'Jl. Mawar No. 3', rtId: tenantA.id });

  // Sample warga
  const wargaSeed = [
    {
      email: 'budi@kampungku.id',
      name: 'Budi Santoso',
      phone: '081234567890',
      nik: '3201012501900001',
      noKk: '3201011234567890',
      alamat: 'Jl. Melati No. 1',
      keluarga: [
        { nama: 'Budi Santoso', nik: '3201012501900001', hubungan: 'Kepala Keluarga', tglLahir: new Date('1990-01-25'), jenisKelamin: 'Laki-laki', pekerjaan: 'Karyawan Swasta', pendidikan: 'S1' },
        { nama: 'Dewi Santoso', nik: '3201016608920002', hubungan: 'Istri', tglLahir: new Date('1992-08-26'), jenisKelamin: 'Perempuan', pekerjaan: 'Ibu Rumah Tangga', pendidikan: 'SMA' },
        { nama: 'Rian Santoso', nik: '3201010508150003', hubungan: 'Anak', tglLahir: new Date('2015-08-05'), jenisKelamin: 'Laki-laki', pekerjaan: null, pendidikan: 'SD' },
      ],
    },
    {
      email: 'siti@kampungku.id',
      name: 'Siti Rahayu',
      phone: '081234567891',
      nik: '3201015506850002',
      noKk: '3201019876543210',
      alamat: 'Jl. Melati No. 3',
      keluarga: [
        { nama: 'Siti Rahayu', nik: '3201015506850002', hubungan: 'Kepala Keluarga', tglLahir: new Date('1985-06-15'), jenisKelamin: 'Perempuan', pekerjaan: 'Guru', pendidikan: 'S1' },
        { nama: 'Dani Pratama', nik: '3201011203180004', hubungan: 'Anak', tglLahir: new Date('2018-03-12'), jenisKelamin: 'Laki-laki', pekerjaan: null, pendidikan: 'TK' },
      ],
    },
    {
      email: 'ahmad@kampungku.id',
      name: 'Ahmad Fauzi',
      phone: '081234567892',
      nik: '3201011203880003',
      noKk: '3201011122334455',
      alamat: 'Jl. Melati No. 5',
      keluarga: [
        { nama: 'Ahmad Fauzi', nik: '3201011203880003', hubungan: 'Kepala Keluarga', tglLahir: new Date('1988-03-12'), jenisKelamin: 'Laki-laki', pekerjaan: 'Wiraswasta', pendidikan: 'SMA' },
      ],
    },
  ];

  for (const ws of wargaSeed) {
    const user = await upsertUser({
      email: ws.email,
      name: ws.name,
      phone: ws.phone,
      password: 'Warga1234!',
      role: 'WARGA',
      tenantId: tenantA.id,
    });
    const warga = await upsertWarga({
      userId: user.id,
      nik: ws.nik,
      noKk: ws.noKk,
      alamat: ws.alamat,
      rtId: tenantA.id,
    });

    const existingAnggota = await prisma.anggotaKeluarga.findFirst({ where: { wargaId: warga.id } });
    if (!existingAnggota && ws.keluarga.length > 0) {
      await prisma.anggotaKeluarga.createMany({
        data: ws.keluarga.map((k) => ({ wargaId: warga.id, ...k })),
      });
    }
  }
  console.log(`[OK] ${wargaSeed.length} warga + anggota keluarga`);

  // 4. Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Seeding selesai. Akun tersedia:');
  console.log('───────────────────────────────────────────────────────────');
  console.log('Platform:');
  console.log('  SUPER_ADMIN   super@kampungku.id              SuperAdmin1234!');
  console.log('\nTenant A — RT 01 RW 01 Kel. Sukamaju:');
  console.log('  ADMIN         admin.sukamaju@kampungku.id     Admin1234!');
  console.log('  KETUA_RT      ketua@kampungku.id              Ketua1234!');
  console.log('  BENDAHARA     bendahara@kampungku.id          Bendahara1234!');
  console.log('  SEKRETARIS    sekretaris@kampungku.id         Sekretaris1234!');
  console.log('  WARGA         budi@kampungku.id               Warga1234!');
  console.log('  WARGA         siti@kampungku.id               Warga1234!');
  console.log('  WARGA         ahmad@kampungku.id              Warga1234!');
  console.log('\nTenant B — RT 02 RW 03 Kel. Mawar:');
  console.log('  ADMIN         admin.mawar@kampungku.id        Admin1234!');
  console.log('═══════════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('Seeding gagal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
