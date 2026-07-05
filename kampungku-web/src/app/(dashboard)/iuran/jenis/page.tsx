'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Plus, ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import {
  useJenisIuranList,
  useCreateJenisIuran,
  useUpdateJenisIuran,
  useDeleteJenisIuran,
} from '@/hooks/useJenisIuran';
import { formatRupiah } from '@/lib/utils';
import type { JenisIuran } from '@/types';

const formSchema = z.object({
  nama: z.string().min(3, 'Minimal 3 karakter').max(100),
  jumlah: z.number().positive('Harus lebih dari 0'),
  keterangan: z.string().max(500).optional(),
  isAktif: z.enum(['true', 'false']).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function JenisIuranFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item?: JenisIuran;
}) {
  const isEdit = !!item;
  const createMutation = useCreateJenisIuran();
  const updateMutation = useUpdateJenisIuran(item?.id ?? '');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: item
      ? {
          nama: item.nama,
          jumlah: item.jumlah,
          keterangan: item.keterangan ?? '',
          isAktif: item.isAktif ? 'true' : 'false',
        }
      : { isAktif: 'true' },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FormValues) => {
    if (isEdit) {
      updateMutation.mutate(
        {
          nama: values.nama,
          jumlah: values.jumlah,
          keterangan: values.keterangan || undefined,
          isAktif: values.isAktif === 'true',
        },
        {
          onSuccess: () => {
            reset();
            onOpenChange(false);
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          nama: values.nama,
          jumlah: values.jumlah,
          keterangan: values.keterangan || undefined,
        },
        {
          onSuccess: () => {
            reset();
            onOpenChange(false);
          },
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading font-semibold">
            {isEdit ? 'Edit Jenis Iuran' : 'Tambah Jenis Iuran'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Nama <span className="text-red-500">*</span>
            </Label>
            <Input
              {...register('nama')}
              placeholder="Mis. Iuran Sampah"
              className="font-body"
            />
            {errors.nama && (
              <p className="text-xs text-red-500">{errors.nama.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Tarif (Rp) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              placeholder="Mis. 5000"
              className="font-mono"
              {...register('jumlah', { valueAsNumber: true })}
            />
            {errors.jumlah && (
              <p className="text-xs text-red-500">{errors.jumlah.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Keterangan
            </Label>
            <Textarea
              {...register('keterangan')}
              placeholder="Opsional"
              className="font-body resize-none"
              rows={3}
            />
            {errors.keterangan && (
              <p className="text-xs text-red-500">{errors.keterangan.message}</p>
            )}
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <Label className="font-heading text-sm font-semibold text-stone-700">
                Status
              </Label>
              <Select
                value={watch('isAktif') ?? 'true'}
                onValueChange={(v) => setValue('isAktif', v as 'true' | 'false')}
              >
                <SelectTrigger className="font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true" className="font-body">Aktif</SelectItem>
                  <SelectItem value="false" className="font-body">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 font-heading font-semibold"
            >
              {isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              {isEdit ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function JenisIuranPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canManage = user?.role === 'ADMIN' || user?.role === 'BENDAHARA';

  const { data: jenisIuranList, isLoading } = useJenisIuranList();
  const deleteMutation = useDeleteJenisIuran();

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<JenisIuran | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<JenisIuran | null>(null);

  const openCreate = () => {
    setEditItem(undefined);
    setFormOpen(true);
  };

  const openEdit = (item: JenisIuran) => {
    setEditItem(item);
    setFormOpen(true);
  };

  const columns: Column<JenisIuran>[] = [
    {
      key: 'nama',
      header: 'Nama',
      render: (r) => (
        <span className={`font-semibold ${r.isAktif ? 'text-stone-900' : 'text-stone-400'}`}>
          {r.nama}
        </span>
      ),
    },
    {
      key: 'jumlah',
      header: 'Tarif',
      render: (r) => (
        <span className={`font-mono text-sm font-semibold ${r.isAktif ? '' : 'text-stone-400'}`}>
          {formatRupiah(r.jumlah)}
        </span>
      ),
    },
    {
      key: 'keterangan',
      header: 'Keterangan',
      render: (r) => (
        <span className={`font-body text-sm ${r.isAktif ? 'text-stone-600' : 'text-stone-400'}`}>
          {r.keterangan ?? '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-heading ${
            r.isAktif
              ? 'bg-green-100 text-green-700'
              : 'bg-stone-100 text-stone-500'
          }`}
        >
          {r.isAktif ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'aksi',
            header: 'Aksi',
            width: 'w-24',
            render: (r: JenisIuran) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(r)}
                  className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(r)}
                  className="text-xs text-red-500 font-semibold hover:underline flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  Hapus
                </button>
              </div>
            ),
          } satisfies Column<JenisIuran>,
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Jenis Iuran"
        description="Kelola jenis dan tarif iuran RT"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="h-9 font-heading font-semibold text-sm text-stone-600"
            >
              <ArrowLeft size={14} className="mr-1.5" />
              Kembali
            </Button>
            {canManage && (
              <Button
                onClick={openCreate}
                className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
              >
                <Plus size={14} className="mr-1.5" />
                Tambah Jenis
              </Button>
            )}
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={jenisIuranList ?? []}
        isLoading={isLoading}
        emptyTitle="Belum ada jenis iuran"
        emptyDescription="Tambah jenis iuran untuk mulai membuat tagihan"
      />

      <JenisIuranFormDialog
        key={editItem?.id ?? 'create'}
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditItem(undefined);
        }}
        item={editItem}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Jenis Iuran"
        description={`Hapus "${deleteTarget?.nama}"? Jenis iuran tidak bisa dihapus jika masih ada tagihan terkait.`}
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={() =>
          deleteMutation.mutate(deleteTarget!.id, {
            onSettled: () => setDeleteTarget(null),
          })
        }
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
