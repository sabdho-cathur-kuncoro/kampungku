'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Users, Wallet, Bell, MessageSquare, FileText, Home } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { formatRupiah } from '@/lib/utils';
import type { ApiResponse, DashboardStats } from '@/types';

const BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export default function BerandaPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
      return data.data;
    },
  });

  const now = new Date();
  const bulanLabel = BULAN[now.getMonth()];
  const iuran = data?.iuranBulanIni;
  const lunasTotal = iuran?.byStatus?.LUNAS?.total ?? 0;
  const lunasCount = iuran?.byStatus?.LUNAS?.count ?? 0;
  const totalTagihan = (iuran?.byStatus?.LUNAS?.count ?? 0) +
    (iuran?.byStatus?.MENUNGGU_VERIFIKASI?.count ?? 0) +
    (iuran?.byStatus?.BELUM_BAYAR?.count ?? 0);
  const lunasPercent = totalTagihan > 0 ? Math.round((lunasCount / totalTagihan) * 100) : 0;

  return (
    <div>
      <PageHeader
        title={`Selamat datang, ${user?.name?.split(' ')[0] ?? 'Admin'}`}
        description="Ringkasan data dan aktivitas RT Anda"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-stone-200 p-5">
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-7 w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Warga"
            sublabel="Semua status tinggal"
            value={data?.warga.total ?? 0}
          />
          <StatCard
            label="Iuran Terkumpul"
            sublabel={`${bulanLabel} ${now.getFullYear()}`}
            value={formatRupiah(lunasTotal)}
            trend={`${lunasPercent}%`}
            trendUp={lunasPercent >= 50}
            progress={lunasPercent}
          />
          <StatCard
            label="Pengumuman Aktif"
            sublabel="Saat ini"
            value={data?.pengumumanAktif ?? 0}
          />
          <StatCard
            label="Pengaduan Baru"
            sublabel="Belum ditangani"
            value={data?.pengaduan?.BARU ?? 0}
          />
          <StatCard
            label="Tagihan Belum Bayar"
            sublabel={`${bulanLabel} ${now.getFullYear()}`}
            value={data?.iuranBulanIni?.byStatus?.BELUM_BAYAR?.count ?? 0}
          />
          <StatCard
            label="Surat Diajukan"
            sublabel="Menunggu proses"
            value={data?.surat?.DIAJUKAN ?? 0}
          />
        </div>
      )}

      {/* Quick links */}
      <div className="mt-8">
        <h2 className="font-heading text-sm font-semibold text-stone-700 mb-3">Akses Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href: '/warga', icon: Users, label: 'Warga', color: 'text-blue-600 bg-blue-50', roles: ['SUPER_ADMIN', 'ADMIN', 'KETUA_RT', 'BENDAHARA', 'SEKRETARIS'] },
            { href: '/iuran', icon: Wallet, label: 'Iuran', color: 'text-green-600 bg-green-50', roles: ['SUPER_ADMIN', 'ADMIN', 'BENDAHARA'] },
            { href: '/pengumuman', icon: Bell, label: 'Pengumuman', color: 'text-amber-600 bg-amber-50' },
            { href: '/surat', icon: FileText, label: 'Surat', color: 'text-purple-600 bg-purple-50' },
            { href: '/pengaduan', icon: MessageSquare, label: 'Pengaduan', color: 'text-red-600 bg-red-50' },
            { href: '/pengaturan', icon: Home, label: 'Pengaturan', color: 'text-stone-600 bg-stone-100' },
          ].filter(({ roles }) => !roles || !user?.role || roles.includes(user.role))
           .map(({ href, icon: Icon, label, color }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon size={20} />
              </div>
              <span className="font-heading text-xs font-semibold text-stone-700">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
