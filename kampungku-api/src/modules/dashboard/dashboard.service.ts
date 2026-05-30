import { prisma } from '../../config/database';

const AGE_GROUPS = [
  { label: 'Balita (0–5)', min: 0, max: 5 },
  { label: 'Anak-anak (6–12)', min: 6, max: 12 },
  { label: 'Remaja (13–17)', min: 13, max: 17 },
  { label: 'Dewasa (18–60)', min: 18, max: 60 },
  { label: 'Lansia (61+)', min: 61, max: Infinity },
] as const;

function ageFromDob(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export const dashboardService = {
  async getStats(tenantId: string) {
    const now = new Date();

    const [
      totalWarga,
      statusTinggalGroups,
      pengaduanGroups,
      suratGroups,
      iuranGroups,
      pengumumanAktif,
      totalAnggotaKeluarga,
    ] = await Promise.all([
      prisma.warga.count({ where: { rtId: tenantId } }),

      prisma.warga.groupBy({
        by: ['statusTinggal'],
        where: { rtId: tenantId },
        _count: { id: true },
      }),

      prisma.pengaduan.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),

      prisma.permohonanSurat.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),

      prisma.iuranTagihan.groupBy({
        by: ['status'],
        where: { rtId: tenantId, bulan: now.getMonth() + 1, tahun: now.getFullYear() },
        _count: { id: true },
        _sum: { jumlah: true },
      }),

      prisma.pengumuman.count({
        where: {
          rtId: tenantId,
          tglMulai: { lte: now },
          OR: [{ tglSelesai: null }, { tglSelesai: { gte: now } }],
        },
      }),

      prisma.anggotaKeluarga.count({
        where: { warga: { rtId: tenantId } },
      }),
    ]);

    return {
      warga: {
        total: totalWarga,
        byStatus: Object.fromEntries(
          statusTinggalGroups.map((g) => [g.statusTinggal, g._count.id]),
        ),
      },
      keluarga: { totalAnggota: totalAnggotaKeluarga },
      pengaduan: Object.fromEntries(
        pengaduanGroups.map((g) => [g.status, g._count.id]),
      ),
      surat: Object.fromEntries(
        suratGroups.map((g) => [g.status, g._count.id]),
      ),
      iuranBulanIni: {
        bulan: now.getMonth() + 1,
        tahun: now.getFullYear(),
        byStatus: Object.fromEntries(
          iuranGroups.map((g) => [
            g.status,
            { count: g._count.id, total: Number(g._sum.jumlah ?? 0) },
          ]),
        ),
      },
      pengumumanAktif,
    };
  },

  async getDemografi(tenantId: string) {
    const [statusTinggal, anggota] = await Promise.all([
      prisma.warga.groupBy({
        by: ['statusTinggal'],
        where: { rtId: tenantId },
        _count: { id: true },
      }),

      prisma.anggotaKeluarga.findMany({
        where: { warga: { rtId: tenantId } },
        select: { tglLahir: true, jenisKelamin: true, pekerjaan: true },
      }),
    ]);

    // Age groups from anggota keluarga
    const ageGroupCounts = AGE_GROUPS.map((g) => ({
      label: g.label,
      count: anggota.filter((a) => {
        const age = ageFromDob(a.tglLahir);
        return age >= g.min && age <= g.max;
      }).length,
    }));

    // Gender distribution
    const genderMap: Record<string, number> = {};
    for (const a of anggota) {
      const k = a.jenisKelamin.toUpperCase();
      genderMap[k] = (genderMap[k] ?? 0) + 1;
    }

    // Top 10 pekerjaan
    const pekerjaanMap: Record<string, number> = {};
    for (const a of anggota) {
      if (!a.pekerjaan) continue;
      const k = a.pekerjaan;
      pekerjaanMap[k] = (pekerjaanMap[k] ?? 0) + 1;
    }
    const topPekerjaan = Object.entries(pekerjaanMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pekerjaan, count]) => ({ pekerjaan, count }));

    return {
      statusTinggal: Object.fromEntries(
        statusTinggal.map((g) => [g.statusTinggal, g._count.id]),
      ),
      kelompokUsia: ageGroupCounts,
      jenisKelamin: genderMap,
      topPekerjaan,
      totalAnggota: anggota.length,
    };
  },

  async getKeuangan(tenantId: string, tahun?: number) {
    const year = tahun ?? new Date().getFullYear();

    const tagihan = await prisma.iuranTagihan.findMany({
      where: { rtId: tenantId, tahun: year },
      select: { bulan: true, status: true, jumlah: true },
    });

    // Build month-by-month summary (1–12)
    const months = Array.from({ length: 12 }, (_, i) => {
      const bulan = i + 1;
      const rows = tagihan.filter((t) => t.bulan === bulan);

      const lunas = rows.filter((t) => t.status === 'LUNAS');
      const menunggu = rows.filter((t) => t.status === 'MENUNGGU_VERIFIKASI');
      const belumBayar = rows.filter((t) => t.status === 'BELUM_BAYAR');

      return {
        bulan,
        totalTagihan: rows.length,
        lunas: { count: lunas.length, total: lunas.reduce((s, t) => s + Number(t.jumlah), 0) },
        menungguVerifikasi: { count: menunggu.length, total: menunggu.reduce((s, t) => s + Number(t.jumlah), 0) },
        belumBayar: { count: belumBayar.length, total: belumBayar.reduce((s, t) => s + Number(t.jumlah), 0) },
      };
    });

    const totalLunas = months.reduce((s, m) => s + m.lunas.total, 0);
    const totalTagihan = months.reduce((s, m) => s + m.totalTagihan, 0);

    return { tahun: year, totalTagihan, totalLunas, bulan: months };
  },
};
