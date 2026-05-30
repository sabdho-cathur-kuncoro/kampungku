import { cn } from '@/lib/utils';

type Status =
  | 'BELUM_BAYAR'
  | 'MENUNGGU_VERIFIKASI'
  | 'LUNAS'
  | 'DIAJUKAN'
  | 'DIPROSES'
  | 'DISETUJUI'
  | 'DITOLAK'
  | 'BARU'
  | 'SELESAI'
  | 'TETAP'
  | 'KONTRAK'
  | 'KOST'
  | 'PINDAH'
  | 'UMUM'
  | 'KEGIATAN'
  | 'KEUANGAN'
  | 'DARURAT';

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  // Iuran
  BELUM_BAYAR: { label: 'Belum Bayar', className: 'bg-red-100 text-red-600' },
  MENUNGGU_VERIFIKASI: { label: 'Menunggu', className: 'bg-amber-100 text-amber-700' },
  LUNAS: { label: 'Lunas', className: 'bg-green-100 text-green-700' },
  // Surat & Pengaduan
  DIAJUKAN: { label: 'Diajukan', className: 'bg-blue-100 text-blue-700' },
  DIPROSES: { label: 'Diproses', className: 'bg-blue-100 text-blue-700' },
  DISETUJUI: { label: 'Disetujui', className: 'bg-green-100 text-green-700' },
  DITOLAK: { label: 'Ditolak', className: 'bg-red-100 text-red-600' },
  // Pengaduan only
  BARU: { label: 'Baru', className: 'bg-red-100 text-red-600' },
  SELESAI: { label: 'Selesai', className: 'bg-stone-100 text-stone-600' },
  // Status tinggal
  TETAP: { label: 'Tetap', className: 'bg-green-100 text-green-700' },
  KONTRAK: { label: 'Kontrak', className: 'bg-blue-100 text-blue-700' },
  KOST: { label: 'Kost', className: 'bg-purple-100 text-purple-700' },
  PINDAH: { label: 'Pindah', className: 'bg-stone-100 text-stone-500' },
  // Kategori pengumuman
  UMUM: { label: 'Umum', className: 'bg-stone-100 text-stone-600' },
  KEGIATAN: { label: 'Kegiatan', className: 'bg-blue-100 text-blue-700' },
  KEUANGAN: { label: 'Keuangan', className: 'bg-green-100 text-green-700' },
  DARURAT: { label: 'Darurat', className: 'bg-red-100 text-red-600' },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-stone-100 text-stone-600' };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-heading',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
