'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, MessageSquare, ShieldAlert, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { usePengaduanList, useCreatePengaduan } from '@/hooks/usePengaduan';
import { formatTanggalPendek } from '@/lib/utils';
import type { Pengaduan, StatusPengaduan } from '@/types';

const CAN_VIEW_ALL = ['ADMIN', 'KETUA_RT', 'SUPER_ADMIN'] as const;

const STATUS_OPTIONS: { value: StatusPengaduan | ''; label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'BARU', label: 'Baru' },
  { value: 'DIPROSES', label: 'Diproses' },
  { value: 'SELESAI', label: 'Selesai' },
  { value: 'DITOLAK', label: 'Ditolak' },
];

// ─── Buat pengaduan dialog ────────────────────────────────────────────────────

const schema = z.object({
  judul: z.string().min(5, 'Judul minimal 5 karakter').max(200),
  deskripsi: z.string().min(20, 'Deskripsi minimal 20 karakter'),
  isAnonim: z.boolean(),
});
type CreateForm = z.infer<typeof schema>;

function BuatPengaduanDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const createMutation = useCreatePengaduan();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(schema),
    defaultValues: { isAnonim: false },
  });

  const onSubmit = (values: CreateForm) => {
    createMutation.mutate(values, {
      onSuccess: (data) => {
        reset();
        onOpenChange(false);
        if (!values.isAnonim) {
          router.push(`/pengaduan/${data.id}`);
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold">Buat Pengaduan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Judul <span className="text-red-500">*</span>
            </Label>
            <Input
              {...register('judul')}
              placeholder="Judul singkat pengaduan"
              className="font-body"
            />
            {errors.judul && <p className="text-xs text-red-500">{errors.judul.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Deskripsi <span className="text-red-500">*</span>
            </Label>
            <Textarea
              {...register('deskripsi')}
              placeholder="Jelaskan pengaduan Anda secara lengkap (minimal 20 karakter)..."
              rows={5}
              className="font-body resize-none"
            />
            {errors.deskripsi && <p className="text-xs text-red-500">{errors.deskripsi.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">Kirim Sebagai</Label>
            <Select
              value={watch('isAnonim') ? 'anonim' : 'diri'}
              onValueChange={(v) => setValue('isAnonim', v === 'anonim')}
            >
              <SelectTrigger className="font-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diri" className="font-body">Atas nama saya</SelectItem>
                <SelectItem value="anonim" className="font-body">Anonim (nama tidak ditampilkan)</SelectItem>
              </SelectContent>
            </Select>
            {watch('isAnonim') && (
              <p className="text-xs text-amber-600 font-body mt-1">
                Pengaduan anonim tidak dapat dilacak. Anda tidak akan bisa melihat detailnya setelah dikirim.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="font-heading font-semibold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-green-600 hover:bg-green-700 font-heading font-semibold"
            >
              {createMutation.isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              Kirim Pengaduan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PengaduanPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canViewAll = CAN_VIEW_ALL.includes(user?.role as (typeof CAN_VIEW_ALL)[number]);

  const [buatOpen, setBuatOpen] = useState(false);
  const [status, setStatus] = useState<StatusPengaduan | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePengaduanList(
    canViewAll ? { status: status || undefined, page, limit: 20 } : { page: 1, limit: 1 },
  );

  const columns: Column<Pengaduan>[] = [
    {
      key: 'judul',
      header: 'Judul',
      render: (r) => (
        <button
          onClick={() => router.push(`/pengaduan/${r.id}`)}
          className="font-semibold text-stone-900 hover:text-green-700 transition-colors text-left line-clamp-2"
        >
          {r.judul}
        </button>
      ),
    },
    {
      key: 'warga',
      header: 'Pelapor',
      render: (r) =>
        r.isAnonim ? (
          <span className="inline-flex items-center gap-1 font-body text-xs text-stone-400 italic">
            <ShieldAlert size={12} />
            Anonim
          </span>
        ) : (
          <span className="font-body text-sm">{r.warga?.user.name ?? '—'}</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'tanggapan',
      header: 'Tanggapan',
      render: (r) => (
        <span className="text-stone-500 text-xs line-clamp-1">
          {r.tanggapan ?? '—'}
        </span>
      ),
    },
    {
      key: 'tgl',
      header: 'Masuk',
      render: (r) => (
        <span className="text-stone-500 text-xs">{formatTanggalPendek(r.createdAt)}</span>
      ),
    },
    {
      key: 'aksi',
      header: '',
      width: 'w-16',
      render: (r) => (
        <button
          onClick={() => router.push(`/pengaduan/${r.id}`)}
          className="text-xs text-blue-600 font-semibold hover:underline"
        >
          Detail
        </button>
      ),
    },
  ];

  if (!canViewAll) {
    return (
      <div>
        <PageHeader
          title="Pengaduan"
          description="Sampaikan keluhan atau masukan untuk RT"
          action={
            <Button
              onClick={() => setBuatOpen(true)}
              className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
            >
              <Plus size={14} className="mr-1.5" />
              Buat Pengaduan
            </Button>
          }
        />

        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center">
            <MessageSquare size={24} className="text-stone-400" />
          </div>
          <div>
            <p className="font-heading font-bold text-stone-700 text-lg">Sampaikan Pengaduan Anda</p>
            <p className="font-body text-sm text-stone-500 mt-1 max-w-xs">
              Pengaduan akan diteruskan ke pengurus RT untuk ditindaklanjuti.
              Anda dapat memilih untuk mengirim secara anonim.
            </p>
          </div>
          <Button
            onClick={() => setBuatOpen(true)}
            className="bg-green-600 hover:bg-green-700 font-heading font-semibold mt-2"
          >
            <Plus size={14} className="mr-1.5" />
            Buat Pengaduan
          </Button>
        </div>

        <BuatPengaduanDialog open={buatOpen} onOpenChange={setBuatOpen} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Pengaduan"
        description="Kelola pengaduan dan masukan warga"
        action={
          <Button
            onClick={() => setBuatOpen(true)}
            className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
          >
            <Plus size={14} className="mr-1.5" />
            Buat Pengaduan
          </Button>
        }
      />

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <Select
          value={status || 'ALL'}
          onValueChange={(v) => {
            setStatus(v === 'ALL' ? '' : (v as StatusPengaduan));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40 h-9 font-body text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value || 'ALL'} value={o.value || 'ALL'} className="font-body text-sm">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={setPage}
        emptyTitle="Tidak ada pengaduan"
        emptyDescription="Belum ada pengaduan masuk untuk filter ini"
      />

      <BuatPengaduanDialog open={buatOpen} onOpenChange={setBuatOpen} />
    </div>
  );
}
