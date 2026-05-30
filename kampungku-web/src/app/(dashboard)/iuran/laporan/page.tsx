'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, Clock, AlertCircle, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLaporan } from '@/hooks/useIuran';
import { formatRupiah } from '@/lib/utils';

const BULAN_LABEL = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const now = new Date();
const THIS_YEAR = now.getFullYear();
const THIS_MONTH = now.getMonth() + 1;
const YEARS = Array.from({ length: 5 }, (_, i) => THIS_YEAR - 2 + i);

export default function LaporanIuranPage() {
  const router = useRouter();
  const [bulan, setBulan] = useState<number | undefined>(THIS_MONTH);
  const [tahun, setTahun] = useState<number | undefined>(THIS_YEAR);

  const { data, isLoading } = useLaporan({ bulan, tahun });

  const totalTerkumpul = data?.lunas.total ?? 0;
  const totalMenunggu = data?.menungguVerifikasi.total ?? 0;
  const totalBelum = data?.belumBayar.total ?? 0;
  const totalTagihan = data?.totalTagihan ?? 0;
  const lunasPct =
    totalTagihan > 0 ? Math.round(((data?.lunas.count ?? 0) / totalTagihan) * 100) : 0;

  const periodLabel =
    bulan && tahun
      ? `${BULAN_LABEL[bulan]} ${tahun}`
      : tahun
        ? `Tahun ${tahun}`
        : 'Semua Periode';

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Laporan Iuran"
        description={`Rekap keuangan — ${periodLabel}`}
        action={
          <Button
            variant="outline"
            onClick={() => router.push('/iuran')}
            className="h-9 font-heading font-semibold text-sm"
          >
            <ArrowLeft size={14} className="mr-1.5" />
            Kembali
          </Button>
        }
      />

      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select
          value={bulan ? String(bulan) : 'ALL'}
          onValueChange={(v) => setBulan(v === 'ALL' ? undefined : Number(v))}
        >
          <SelectTrigger className="w-36 h-9 font-body text-sm">
            <SelectValue placeholder="Semua Bulan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="font-body text-sm">Semua Bulan</SelectItem>
            {BULAN_LABEL.slice(1).map((label, i) => (
              <SelectItem key={i + 1} value={String(i + 1)} className="font-body text-sm">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={tahun ? String(tahun) : 'ALL'}
          onValueChange={(v) => setTahun(v === 'ALL' ? undefined : Number(v))}
        >
          <SelectTrigger className="w-28 h-9 font-body text-sm">
            <SelectValue placeholder="Semua Tahun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="font-body text-sm">Semua</SelectItem>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)} className="font-body text-sm">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-stone-200 p-5">
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-7 w-40" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label="Total Terkumpul"
            sublabel={`${data?.lunas.count ?? 0} tagihan lunas`}
            value={formatRupiah(totalTerkumpul)}
            trend={`${lunasPct}%`}
            trendUp={lunasPct >= 50}
            progress={lunasPct}
          />
          <StatCard
            label="Total Tagihan"
            sublabel="Semua status"
            value={totalTagihan}
          />
          <StatCard
            label="Menunggu Verifikasi"
            sublabel={`${data?.menungguVerifikasi.count ?? 0} tagihan`}
            value={formatRupiah(totalMenunggu)}
          />
          <StatCard
            label="Belum Dibayar"
            sublabel={`${data?.belumBayar.count ?? 0} tagihan`}
            value={formatRupiah(totalBelum)}
          />
        </div>
      )}

      {/* Breakdown table */}
      {!isLoading && data && (
        <div className="mt-6 bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-200">
            <h2 className="font-heading text-sm font-semibold text-stone-700">Rincian per Status</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50/50 border-b border-stone-200">
                <th className="font-heading text-xs font-semibold uppercase tracking-wide text-stone-500 text-left py-3 px-4">Status</th>
                <th className="font-heading text-xs font-semibold uppercase tracking-wide text-stone-500 text-right py-3 px-4">Jumlah Tagihan</th>
                <th className="font-heading text-xs font-semibold uppercase tracking-wide text-stone-500 text-right py-3 px-4">Total Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-stone-100">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-green-600" />
                    <span className="font-heading text-sm font-semibold text-green-700">Lunas</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-body text-sm">{data.lunas.count}</td>
                <td className="py-3 px-4 text-right font-mono text-sm font-semibold text-green-700">
                  {formatRupiah(data.lunas.total)}
                </td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-amber-600" />
                    <span className="font-heading text-sm font-semibold text-amber-700">Menunggu Verifikasi</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-body text-sm">{data.menungguVerifikasi.count}</td>
                <td className="py-3 px-4 text-right font-mono text-sm font-semibold text-amber-700">
                  {formatRupiah(data.menungguVerifikasi.total)}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-500" />
                    <span className="font-heading text-sm font-semibold text-red-600">Belum Bayar</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-body text-sm">{data.belumBayar.count}</td>
                <td className="py-3 px-4 text-right font-mono text-sm font-semibold text-red-600">
                  {formatRupiah(data.belumBayar.total)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-stone-50/50 border-t border-stone-200">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Receipt size={14} className="text-stone-500" />
                    <span className="font-heading text-sm font-bold text-stone-700">Total</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-heading text-sm font-bold">{data.totalTagihan}</td>
                <td className="py-3 px-4 text-right font-mono text-sm font-bold text-stone-800">
                  {formatRupiah(totalTerkumpul + totalMenunggu + totalBelum)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
