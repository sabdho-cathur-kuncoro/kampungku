'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ShieldAlert, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import { usePengaduanDetail, useUpdateStatusPengaduan } from '@/hooks/usePengaduan';
import { formatTanggal } from '@/lib/utils';
import type { StatusPengaduan } from '@/types';

const CAN_MANAGE = ['ADMIN', 'KETUA_RT', 'SUPER_ADMIN'] as const;

const STATUS_OPTIONS: { value: StatusPengaduan; label: string; color: string }[] = [
  { value: 'BARU', label: 'Baru', color: 'text-red-600' },
  { value: 'DIPROSES', label: 'Diproses', color: 'text-blue-600' },
  { value: 'SELESAI', label: 'Selesai', color: 'text-stone-600' },
  { value: 'DITOLAK', label: 'Ditolak', color: 'text-red-600' },
];

const updateSchema = z.object({
  status: z.enum(['BARU', 'DIPROSES', 'SELESAI', 'DITOLAK']),
  tanggapan: z.string().min(5, 'Tanggapan minimal 5 karakter').max(1000).optional().or(z.literal('')),
});
type UpdateForm = z.infer<typeof updateSchema>;

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-3 border-b border-stone-100 last:border-0">
      <span className="font-heading text-xs font-semibold text-stone-500 uppercase tracking-wide w-32 shrink-0 pt-0.5">
        {label}
      </span>
      <div className="font-body text-sm text-stone-800">{value}</div>
    </div>
  );
}

export default function PengaduanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading } = usePengaduanDetail(params.id);
  const updateMutation = useUpdateStatusPengaduan();

  const canManage = CAN_MANAGE.includes(user?.role as (typeof CAN_MANAGE)[number]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateForm>({
    resolver: zodResolver(updateSchema),
  });

  const openEdit = () => {
    if (data) {
      reset({ status: data.status, tanggapan: data.tanggapan ?? '' });
    }
    setEditOpen(true);
  };

  const onSubmit = (values: UpdateForm) => {
    updateMutation.mutate(
      {
        id: params.id,
        status: values.status,
        tanggapan: values.tanggapan || undefined,
      },
      { onSuccess: () => setEditOpen(false) },
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="font-heading font-semibold text-stone-500">Pengaduan tidak ditemukan</p>
        <Button variant="outline" onClick={() => router.push('/pengaduan')} className="mt-4 font-heading font-semibold">
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Detail Pengaduan"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/pengaduan')}
              className="h-9 font-heading font-semibold text-sm"
            >
              <ArrowLeft size={14} className="mr-1.5" />
              Kembali
            </Button>
            {canManage && (
              <Button
                onClick={openEdit}
                className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
              >
                Perbarui Status
              </Button>
            )}
          </div>
        }
      />

      {/* Status badge */}
      <div className="flex items-center gap-3 mb-4">
        <StatusBadge status={data.status} />
        {data.isAnonim && (
          <span className="inline-flex items-center gap-1 font-heading text-xs font-semibold text-stone-400">
            <ShieldAlert size={12} />
            Anonim
          </span>
        )}
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 mb-4">
        <InfoRow label="Judul" value={<span className="font-semibold">{data.judul}</span>} />
        <InfoRow
          label="Pelapor"
          value={
            data.isAnonim ? (
              <span className="italic text-stone-400">Anonim</span>
            ) : (
              data.warga?.user.name ?? '—'
            )
          }
        />
        <InfoRow label="Masuk" value={formatTanggal(data.createdAt)} />
        {data.updatedAt !== data.createdAt && (
          <InfoRow label="Diperbarui" value={formatTanggal(data.updatedAt)} />
        )}
      </div>

      {/* Deskripsi */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 mb-4">
        <h3 className="font-heading text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
          Deskripsi
        </h3>
        <p className="font-body text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
          {data.deskripsi}
        </p>
      </div>

      {/* Tanggapan */}
      {data.tanggapan && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-5">
          <h3 className="font-heading text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">
            Tanggapan Pengurus
          </h3>
          <p className="font-body text-sm text-green-900 whitespace-pre-wrap leading-relaxed">
            {data.tanggapan}
          </p>
        </div>
      )}

      {/* Update status dialog */}
      {canManage && (
        <div
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 transition-opacity ${
            editOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.target === e.currentTarget && setEditOpen(false)}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-xl">
            <h2 className="font-heading font-bold text-stone-900 text-lg mb-4">Perbarui Status</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-heading text-sm font-semibold text-stone-700">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch('status') ?? data.status}
                  onValueChange={(v) => setValue('status', v as StatusPengaduan)}
                >
                  <SelectTrigger className="font-body">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className={`font-body ${o.color}`}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-heading text-sm font-semibold text-stone-700">
                  Tanggapan
                  <span className="text-stone-400 font-normal ml-1">(opsional)</span>
                </Label>
                <Textarea
                  {...register('tanggapan')}
                  placeholder="Berikan tanggapan atau catatan untuk pelapor..."
                  rows={4}
                  className="font-body resize-none"
                />
                {errors.tanggapan && (
                  <p className="text-xs text-red-500">{errors.tanggapan.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 font-heading font-semibold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 font-heading font-semibold"
                >
                  {updateMutation.isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
