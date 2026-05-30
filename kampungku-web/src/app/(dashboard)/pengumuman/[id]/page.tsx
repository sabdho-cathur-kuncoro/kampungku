'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Pencil, X, Loader2, Pin } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import {
  usePengumumanDetail,
  useUpdatePengumuman,
  useDeletePengumuman,
  type UpdatePengumumanPayload,
} from '@/hooks/usePengumuman';
import { formatTanggal, formatTanggalPendek } from '@/lib/utils';
import type { KategoriPengumuman } from '@/types';

const CAN_MANAGE_ROLES = ['ADMIN', 'KETUA_RT', 'SEKRETARIS', 'SUPER_ADMIN'] as const;

const schema = z.object({
  judul: z.string().min(3).max(200).optional().or(z.literal('')),
  konten: z.string().min(10).optional().or(z.literal('')),
  kategori: z.enum(['UMUM', 'KEGIATAN', 'KEUANGAN', 'DARURAT']).optional(),
  tglMulai: z.string().optional().or(z.literal('')),
  tglSelesai: z.string().optional().or(z.literal('')),
  isPinned: z.boolean().optional(),
});
type EditForm = z.infer<typeof schema>;

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 font-body mt-1">{msg}</p>;
}

export default function PengumumanDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === '1');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = usePengumumanDetail(params.id);
  const updateMutation = useUpdatePengumuman(params.id);
  const deleteMutation = useDeletePengumuman();

  const isManageRole = CAN_MANAGE_ROLES.includes(user?.role as (typeof CAN_MANAGE_ROLES)[number]);
  const isAuthor = user?.id === data?.author.id;
  const canEdit = isManageRole || isAuthor;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (data && isEditing) {
      reset({
        judul: data.judul,
        konten: data.konten,
        kategori: data.kategori,
        tglMulai: data.tglMulai.split('T')[0],
        tglSelesai: data.tglSelesai ? data.tglSelesai.split('T')[0] : '',
        isPinned: data.isPinned,
      });
    }
  }, [data, isEditing, reset]);

  const onSubmit = (values: EditForm) => {
    const payload: UpdatePengumumanPayload = {};
    if (values.judul) payload.judul = values.judul;
    if (values.konten) payload.konten = values.konten;
    if (values.kategori) payload.kategori = values.kategori;
    if (values.tglMulai) payload.tglMulai = values.tglMulai;
    payload.tglSelesai = values.tglSelesai || undefined;
    if (values.isPinned !== undefined) payload.isPinned = values.isPinned;

    updateMutation.mutate(payload, { onSuccess: () => setIsEditing(false) });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-72" />
        <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="font-heading font-semibold text-stone-500">Pengumuman tidak ditemukan</p>
        <Button variant="outline" onClick={() => router.push('/pengumuman')} className="mt-4 font-heading font-semibold">
          Kembali ke Daftar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={isEditing ? 'Edit Pengumuman' : data.judul}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/pengumuman')}
              className="h-9 font-heading font-semibold text-sm"
            >
              <ArrowLeft size={14} className="mr-1.5" />
              Kembali
            </Button>
            {canEdit && !isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
              >
                <Pencil size={14} className="mr-1.5" />
                Edit
              </Button>
            )}
            {canEdit && !isEditing && (
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(true)}
                className="h-9 border-red-200 text-red-600 hover:bg-red-50 font-heading font-semibold text-sm"
              >
                Hapus
              </Button>
            )}
            {isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="h-9 font-heading font-semibold text-sm"
              >
                <X size={14} className="mr-1.5" />
                Batal
              </Button>
            )}
          </div>
        }
      />

      {isEditing ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl border border-stone-200 p-6 space-y-5"
        >
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">Judul</Label>
            <Input {...register('judul')} className="font-body" />
            <FieldError msg={errors.judul?.message} />
          </div>

          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">Konten</Label>
            <Textarea {...register('konten')} rows={8} className="font-body resize-none" />
            <FieldError msg={errors.konten?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-heading text-sm font-semibold text-stone-700">Kategori</Label>
              <Select
                value={watch('kategori') ?? data.kategori}
                onValueChange={(v) => setValue('kategori', v as KategoriPengumuman)}
              >
                <SelectTrigger className="font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UMUM">Umum</SelectItem>
                  <SelectItem value="KEGIATAN">Kegiatan</SelectItem>
                  <SelectItem value="KEUANGAN">Keuangan</SelectItem>
                  <SelectItem value="DARURAT">Darurat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-heading text-sm font-semibold text-stone-700">Sematkan (Pin)</Label>
              <Select
                value={watch('isPinned') !== undefined ? String(watch('isPinned')) : String(data.isPinned)}
                onValueChange={(v) => setValue('isPinned', v === 'true')}
              >
                <SelectTrigger className="font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Tidak</SelectItem>
                  <SelectItem value="true">Ya — tampilkan di atas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-heading text-sm font-semibold text-stone-700">Tanggal Mulai</Label>
              <Input {...register('tglMulai')} type="date" className="font-body" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-heading text-sm font-semibold text-stone-700">Tanggal Selesai</Label>
              <Input {...register('tglSelesai')} type="date" className="font-body" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="font-heading font-semibold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700 font-heading font-semibold"
            >
              {updateMutation.isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              Simpan Perubahan
            </Button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {/* Meta bar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-stone-100 bg-stone-50/50">
            <StatusBadge status={data.kategori} />
            {data.isPinned && (
              <span className="inline-flex items-center gap-1 text-xs font-heading font-semibold text-green-700">
                <Pin size={12} /> Disematkan
              </span>
            )}
            <span className="font-body text-xs text-stone-500 ml-auto">
              {formatTanggalPendek(data.tglMulai)}
              {data.tglSelesai && ` — ${formatTanggalPendek(data.tglSelesai)}`}
            </span>
          </div>

          {/* Content */}
          <div className="p-6">
            <h1 className="font-heading text-xl font-bold text-stone-900 mb-4 leading-tight">
              {data.judul}
            </h1>
            <div className="font-body text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
              {data.konten}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/50">
            <p className="font-body text-xs text-stone-500">
              Ditulis oleh{' '}
              <span className="font-semibold text-stone-700">{data.author.name}</span>
              {' · '}
              {formatTanggal(data.createdAt)}
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus Pengumuman"
        description="Pengumuman ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        onConfirm={() =>
          deleteMutation.mutate(params.id, {
            onSuccess: () => router.push('/pengumuman'),
          })
        }
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
