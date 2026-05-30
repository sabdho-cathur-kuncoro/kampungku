jest.mock('../../../config/database', () => ({
  prisma: {
    warga: { count: jest.fn(), groupBy: jest.fn() },
    anggotaKeluarga: { count: jest.fn(), findMany: jest.fn() },
    pengaduan: { groupBy: jest.fn() },
    permohonanSurat: { groupBy: jest.fn() },
    iuranTagihan: { groupBy: jest.fn(), findMany: jest.fn() },
    pengumuman: { count: jest.fn() },
  },
}));

import { prisma } from '../../../config/database';
import { dashboardService } from '../dashboard.service';

const TENANT_A = 'tenant-aaa';
const TENANT_B = 'tenant-bbb';

beforeEach(() => jest.clearAllMocks());

describe('dashboardService.getStats', () => {
  beforeEach(() => {
    (prisma.warga.count as jest.Mock).mockResolvedValue(25);
    (prisma.warga.groupBy as jest.Mock).mockResolvedValue([
      { statusTinggal: 'TETAP', _count: { id: 20 } },
      { statusTinggal: 'KONTRAK', _count: { id: 5 } },
    ]);
    (prisma.pengaduan.groupBy as jest.Mock).mockResolvedValue([
      { status: 'BARU', _count: { id: 3 } },
      { status: 'SELESAI', _count: { id: 10 } },
    ]);
    (prisma.permohonanSurat.groupBy as jest.Mock).mockResolvedValue([
      { status: 'DIAJUKAN', _count: { id: 2 } },
      { status: 'DISETUJUI', _count: { id: 8 } },
    ]);
    (prisma.iuranTagihan.groupBy as jest.Mock).mockResolvedValue([
      { status: 'LUNAS', _count: { id: 15 }, _sum: { jumlah: 750000 } },
      { status: 'BELUM_BAYAR', _count: { id: 5 }, _sum: { jumlah: 250000 } },
    ]);
    (prisma.pengumuman.count as jest.Mock).mockResolvedValue(4);
    (prisma.anggotaKeluarga.count as jest.Mock).mockResolvedValue(60);
  });

  it('returns all stat sections', async () => {
    const result = await dashboardService.getStats(TENANT_A);

    expect(result.warga.total).toBe(25);
    expect(result.warga.byStatus).toMatchObject({ TETAP: 20, KONTRAK: 5 });
    expect(result.keluarga.totalAnggota).toBe(60);
    expect(result.pengaduan).toMatchObject({ BARU: 3, SELESAI: 10 });
    expect(result.surat).toMatchObject({ DIAJUKAN: 2, DISETUJUI: 8 });
    expect(result.iuranBulanIni.byStatus.LUNAS).toMatchObject({ count: 15, total: 750000 });
    expect(result.pengumumanAktif).toBe(4);
  });

  it('cross-tenant isolation: all queries scoped to tenantId', async () => {
    await dashboardService.getStats(TENANT_B);

    expect(prisma.warga.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ rtId: TENANT_B }) }),
    );
    expect(prisma.pengaduan.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_B }) }),
    );
    expect(prisma.iuranTagihan.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ rtId: TENANT_B }) }),
    );
  });

  it('includes bulan and tahun in iuran filter', async () => {
    await dashboardService.getStats(TENANT_A);

    const call = (prisma.iuranTagihan.groupBy as jest.Mock).mock.calls[0][0];
    expect(call.where).toHaveProperty('bulan');
    expect(call.where).toHaveProperty('tahun');
  });
});

describe('dashboardService.getDemografi', () => {
  const now = new Date();
  const yearOf = (age: number) => now.getFullYear() - age;

  beforeEach(() => {
    (prisma.warga.groupBy as jest.Mock).mockResolvedValue([
      { statusTinggal: 'TETAP', _count: { id: 18 } },
      { statusTinggal: 'KOST', _count: { id: 7 } },
    ]);
    (prisma.anggotaKeluarga.findMany as jest.Mock).mockResolvedValue([
      { tglLahir: new Date(`${yearOf(3)}-06-01`), jenisKelamin: 'Laki-laki', pekerjaan: null },
      { tglLahir: new Date(`${yearOf(10)}-06-01`), jenisKelamin: 'Perempuan', pekerjaan: null },
      { tglLahir: new Date(`${yearOf(25)}-06-01`), jenisKelamin: 'Laki-laki', pekerjaan: 'Guru' },
      { tglLahir: new Date(`${yearOf(70)}-06-01`), jenisKelamin: 'Perempuan', pekerjaan: 'Pensiunan' },
      { tglLahir: new Date(`${yearOf(25)}-06-01`), jenisKelamin: 'Laki-laki', pekerjaan: 'Guru' },
    ]);
  });

  it('returns statusTinggal distribution', async () => {
    const result = await dashboardService.getDemografi(TENANT_A);
    expect(result.statusTinggal).toMatchObject({ TETAP: 18, KOST: 7 });
  });

  it('correctly buckets age groups', async () => {
    const result = await dashboardService.getDemografi(TENANT_A);
    const balita = result.kelompokUsia.find((g) => g.label.startsWith('Balita'));
    const anak = result.kelompokUsia.find((g) => g.label.startsWith('Anak'));
    const dewasa = result.kelompokUsia.find((g) => g.label.startsWith('Dewasa'));
    const lansia = result.kelompokUsia.find((g) => g.label.startsWith('Lansia'));

    expect(balita?.count).toBe(1);
    expect(anak?.count).toBe(1);
    expect(dewasa?.count).toBe(2);
    expect(lansia?.count).toBe(1);
  });

  it('returns gender distribution', async () => {
    const result = await dashboardService.getDemografi(TENANT_A);
    expect(result.jenisKelamin['LAKI-LAKI']).toBe(3);
    expect(result.jenisKelamin['PEREMPUAN']).toBe(2);
  });

  it('returns top pekerjaan sorted by count', async () => {
    const result = await dashboardService.getDemografi(TENANT_A);
    expect(result.topPekerjaan[0]).toMatchObject({ pekerjaan: 'Guru', count: 2 });
  });

  it('cross-tenant isolation: queries scoped to tenantId', async () => {
    await dashboardService.getDemografi(TENANT_B);

    expect(prisma.warga.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ rtId: TENANT_B }) }),
    );
    expect(prisma.anggotaKeluarga.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { warga: { rtId: TENANT_B } } }),
    );
  });
});

describe('dashboardService.getKeuangan', () => {
  const mockTagihan = [
    { bulan: 1, status: 'LUNAS', jumlah: 50000 },
    { bulan: 1, status: 'LUNAS', jumlah: 50000 },
    { bulan: 1, status: 'BELUM_BAYAR', jumlah: 50000 },
    { bulan: 3, status: 'MENUNGGU_VERIFIKASI', jumlah: 50000 },
  ];

  beforeEach(() => {
    (prisma.iuranTagihan.findMany as jest.Mock).mockResolvedValue(mockTagihan);
  });

  it('returns 12 months for the given year', async () => {
    const result = await dashboardService.getKeuangan(TENANT_A, 2026);

    expect(result.tahun).toBe(2026);
    expect(result.bulan).toHaveLength(12);
  });

  it('aggregates correctly per month', async () => {
    const result = await dashboardService.getKeuangan(TENANT_A, 2026);

    const jan = result.bulan[0];
    expect(jan.bulan).toBe(1);
    expect(jan.totalTagihan).toBe(3);
    expect(jan.lunas).toMatchObject({ count: 2, total: 100000 });
    expect(jan.belumBayar).toMatchObject({ count: 1, total: 50000 });

    const mar = result.bulan[2];
    expect(mar.menungguVerifikasi).toMatchObject({ count: 1, total: 50000 });
  });

  it('sums total lunas across all months', async () => {
    const result = await dashboardService.getKeuangan(TENANT_A, 2026);
    expect(result.totalLunas).toBe(100000);
    expect(result.totalTagihan).toBe(4);
  });

  it('defaults to current year when tahun not provided', async () => {
    await dashboardService.getKeuangan(TENANT_A);

    expect(prisma.iuranTagihan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tahun: new Date().getFullYear() }),
      }),
    );
  });

  it('cross-tenant isolation: query scoped to tenantId', async () => {
    await dashboardService.getKeuangan(TENANT_B, 2026);

    expect(prisma.iuranTagihan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ rtId: TENANT_B }) }),
    );
  });
});
