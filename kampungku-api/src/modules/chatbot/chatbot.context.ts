import { prisma } from '../../config/database';

export async function buildRtContext(tenantId: string): Promise<string> {
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const [rt, totalWarga, iuranGroups, pengumuman, pengaduan, surat] = await Promise.all([
    prisma.rT.findUnique({
      where: { id: tenantId },
      select: { nama: true, nomorRt: true, nomorRw: true, kelurahan: true, kecamatan: true },
    }),

    prisma.warga.count({ where: { rtId: tenantId } }),

    prisma.iuranTagihan.groupBy({
      by: ['status'],
      where: { rtId: tenantId, bulan, tahun },
      _count: { id: true },
      _sum: { jumlah: true },
    }),

    prisma.pengumuman.findMany({
      where: {
        rtId: tenantId,
        tglMulai: { lte: now },
        OR: [{ tglSelesai: null }, { tglSelesai: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { judul: true, kategori: true, createdAt: true },
    }),

    prisma.pengaduan.findMany({
      where: { tenantId, status: { in: ['BARU', 'DIPROSES'] } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { judul: true, status: true, createdAt: true },
    }),

    prisma.permohonanSurat.findMany({
      where: { tenantId, status: 'DIAJUKAN' },
      orderBy: { tglDiajukan: 'desc' },
      take: 3,
      select: { jenisSurat: true, tglDiajukan: true },
    }),
  ]);

  const iuranByStatus: Record<string, { jumlah: number; total: number }> = {};
  for (const g of iuranGroups) {
    iuranByStatus[g.status] = { jumlah: g._count.id, total: Number(g._sum.jumlah ?? 0) };
  }

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(d);

  const context = {
    rt: rt
      ? {
          nama: rt.nama,
          nomor: `RT ${rt.nomorRt} / RW ${rt.nomorRw}`,
          kelurahan: rt.kelurahan,
          kecamatan: rt.kecamatan,
        }
      : null,
    totalWargaAktif: totalWarga,
    iuranBulanIni: {
      periode: `${bulan}/${tahun}`,
      lunas: {
        jumlah: iuranByStatus['LUNAS']?.jumlah ?? 0,
        total: formatRupiah(iuranByStatus['LUNAS']?.total ?? 0),
      },
      menungguVerifikasi: {
        jumlah: iuranByStatus['MENUNGGU_VERIFIKASI']?.jumlah ?? 0,
        total: formatRupiah(iuranByStatus['MENUNGGU_VERIFIKASI']?.total ?? 0),
      },
      belumBayar: {
        jumlah: iuranByStatus['BELUM_BAYAR']?.jumlah ?? 0,
        total: formatRupiah(iuranByStatus['BELUM_BAYAR']?.total ?? 0),
      },
    },
    pengumumanTerbaru: pengumuman.map((p) => ({
      judul: p.judul,
      kategori: p.kategori,
      tanggal: formatDate(p.createdAt),
    })),
    pengaduanAktif: pengaduan.map((p) => ({
      judul: p.judul,
      status: p.status,
      tanggal: formatDate(p.createdAt),
    })),
    suratMenungguPersetujuan: surat.map((s) => ({
      jenis: s.jenisSurat,
      tanggal: formatDate(s.tglDiajukan),
    })),
  };

  return JSON.stringify(context, null, 2);
}
