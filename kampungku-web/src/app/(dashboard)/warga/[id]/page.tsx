'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Pencil, X, Loader2, Plus, Trash2, UserSquare2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import {
  useWargaDetail,
  useKeluarga,
  useUpdateWarga,
  useCreateKeluarga,
  useUpdateKeluarga,
  useDeleteKeluarga,
  type UpdateWargaPayload,
  type CreateKeluargaPayload,
} from '@/hooks/useWarga';
import { formatNIK, formatTanggal, formatTanggalPendek } from '@/lib/utils';
import type { AnggotaKeluarga, StatusTinggal } from '@/types';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const nikRegex = /^\d{16}$/;

const editWargaSchema = z.object({
  name: z.string().min(2).max(100).optional().or(z.literal('')),
  phone: z.string().max(15).optional().or(z.literal('')),
  nik: z.string().regex(nikRegex, 'NIK harus 16 digit angka').optional().or(z.literal('')),
  noKk: z.string().regex(nikRegex, 'No. KK harus 16 digit angka').optional().or(z.literal('')),
  alamat: z.string().min(5).max(500).optional().or(z.literal('')),
  statusTinggal: z.enum(['TETAP', 'KONTRAK', 'KOST', 'PINDAH']).optional(),
  tglMasuk: z.string().optional().or(z.literal('')),
});
type EditWargaForm = z.infer<typeof editWargaSchema>;

const keluargaSchema = z.object({
  nama: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  nik: z.string().regex(nikRegex, 'NIK harus 16 digit angka'),
  hubungan: z.string().min(2, 'Hubungan wajib diisi').max(30),
  tglLahir: z.string().min(1, 'Tanggal lahir wajib diisi'),
  jenisKelamin: z.enum(['L', 'P']),
  pekerjaan: z.string().max(100).optional().or(z.literal('')),
  pendidikan: z.string().max(50).optional().or(z.literal('')),
});
type KeluargaForm = z.infer<typeof keluargaSchema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-3 border-b border-stone-100 last:border-0">
      <span className="font-heading text-xs font-semibold text-stone-500 uppercase tracking-wide w-36 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="font-body text-sm text-stone-800">{value}</span>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 font-body mt-1">{msg}</p>;
}

function FormField({ label, required, children, error }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-heading text-sm font-semibold text-stone-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      <FieldError msg={error} />
    </div>
  );
}

// ─── Keluarga dialog ──────────────────────────────────────────────────────────

function KeluargaDialog({
  open,
  onOpenChange,
  wargaId,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  wargaId: string;
  editing: AnggotaKeluarga | null;
}) {
  const createMutation = useCreateKeluarga(wargaId);
  const updateMutation = useUpdateKeluarga(wargaId, editing?.id ?? '');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<KeluargaForm>({
    resolver: zodResolver(keluargaSchema),
    defaultValues: { jenisKelamin: 'L' },
  });

  useEffect(() => {
    if (open && editing) {
      reset({
        nama: editing.nama,
        nik: editing.nik,
        hubungan: editing.hubungan,
        tglLahir: editing.tglLahir.split('T')[0],
        jenisKelamin: editing.jenisKelamin as 'L' | 'P',
        pekerjaan: editing.pekerjaan ?? '',
        pendidikan: editing.pendidikan ?? '',
      });
    } else if (open && !editing) {
      reset({ jenisKelamin: 'L' });
    }
  }, [open, editing, reset]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: KeluargaForm) => {
    const payload: CreateKeluargaPayload = {
      ...values,
      pekerjaan: values.pekerjaan || undefined,
      pendidikan: values.pendidikan || undefined,
    };
    if (editing) {
      updateMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    } else {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold">
            {editing ? 'Edit Anggota Keluarga' : 'Tambah Anggota Keluarga'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="Nama Lengkap" required error={errors.nama?.message}>
                <Input {...register('nama')} placeholder="Nama anggota" className="font-body" />
              </FormField>
            </div>
            <FormField label="NIK" required error={errors.nik?.message}>
              <Input {...register('nik')} placeholder="16 digit" maxLength={16} className="font-mono" />
            </FormField>
            <FormField label="Hubungan" required error={errors.hubungan?.message}>
              <Input {...register('hubungan')} placeholder="Istri, Anak, dll" className="font-body" />
            </FormField>
            <FormField label="Tanggal Lahir" required error={errors.tglLahir?.message}>
              <Input {...register('tglLahir')} type="date" className="font-body" />
            </FormField>
            <FormField label="Jenis Kelamin" required error={errors.jenisKelamin?.message}>
              <Select
                value={watch('jenisKelamin')}
                onValueChange={(v) => setValue('jenisKelamin', v as 'L' | 'P')}
              >
                <SelectTrigger className="font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">Laki-laki</SelectItem>
                  <SelectItem value="P">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Pekerjaan" error={errors.pekerjaan?.message}>
              <Input {...register('pekerjaan')} placeholder="Opsional" className="font-body" />
            </FormField>
            <FormField label="Pendidikan" error={errors.pendidikan?.message}>
              <Input {...register('pendidikan')} placeholder="Opsional" className="font-body" />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-heading font-semibold">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 font-heading font-semibold"
            >
              {isPending ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
              {editing ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WargaDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === '1');
  const [keluargaDialog, setKeluargaDialog] = useState(false);
  const [editingAnggota, setEditingAnggota] = useState<AnggotaKeluarga | null>(null);
  const [deleteAnggotaId, setDeleteAnggotaId] = useState<string | null>(null);

  const { data: warga, isLoading } = useWargaDetail(params.id);
  const { data: keluarga, isLoading: isLoadingKeluarga } = useKeluarga(params.id);
  const updateMutation = useUpdateWarga(params.id);
  const deleteKeluargaMutation = useDeleteKeluarga(params.id);

  const canManage =
    user?.role === 'ADMIN' || user?.role === 'KETUA_RT' || user?.id === warga?.user.id;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditWargaForm>({
    resolver: zodResolver(editWargaSchema),
  });

  useEffect(() => {
    if (warga && isEditing) {
      reset({
        name: warga.user.name,
        phone: warga.user.phone ?? '',
        nik: warga.nik,
        noKk: warga.noKk,
        alamat: warga.alamat,
        statusTinggal: warga.statusTinggal,
        tglMasuk: warga.tglMasuk ? warga.tglMasuk.split('T')[0] : '',
      });
    }
  }, [warga, isEditing, reset]);

  const onSubmitEdit = (values: EditWargaForm) => {
    const payload: UpdateWargaPayload = {};
    if (values.name) payload.name = values.name;
    if (values.phone) payload.phone = values.phone;
    if (values.nik) payload.nik = values.nik;
    if (values.noKk) payload.noKk = values.noKk;
    if (values.alamat) payload.alamat = values.alamat;
    if (values.statusTinggal) payload.statusTinggal = values.statusTinggal;
    if (values.tglMasuk) payload.tglMasuk = values.tglMasuk;

    updateMutation.mutate(payload, {
      onSuccess: () => setIsEditing(false),
    });
  };

  const keluargaColumns: Column<AnggotaKeluarga>[] = [
    { key: 'nama', header: 'Nama', render: (r) => <span className="font-semibold text-stone-900">{r.nama}</span> },
    { key: 'nik', header: 'NIK', render: (r) => <span className="font-mono text-xs">{formatNIK(r.nik)}</span> },
    { key: 'hubungan', header: 'Hubungan', render: (r) => r.hubungan },
    {
      key: 'tglLahir',
      header: 'Tgl Lahir',
      render: (r) => formatTanggalPendek(r.tglLahir),
    },
    {
      key: 'jk',
      header: 'JK',
      render: (r) => (r.jenisKelamin === 'L' ? 'L' : 'P'),
    },
    {
      key: 'aksi',
      header: 'Aksi',
      width: 'w-20',
      render: (r) =>
        canManage ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingAnggota(r);
                setKeluargaDialog(true);
              }}
              className="text-stone-400 hover:text-stone-700 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => setDeleteAnggotaId(r.id)}
              className="text-stone-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : null,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!warga) {
    return (
      <div className="text-center py-20">
        <p className="font-heading font-semibold text-stone-500">Warga tidak ditemukan</p>
        <Button
          variant="outline"
          onClick={() => router.push('/warga')}
          className="mt-4 font-heading font-semibold"
        >
          Kembali ke Daftar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={warga.user.name}
        description={`NIK: ${formatNIK(warga.nik)}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/warga')}
              className="h-9 font-heading font-semibold text-sm"
            >
              <ArrowLeft size={14} className="mr-1.5" />
              Kembali
            </Button>
            {canManage && !isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
              >
                <Pencil size={14} className="mr-1.5" />
                Edit
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

      <Tabs defaultValue="info" className="mt-2">
        <TabsList className="mb-4">
          <TabsTrigger value="info" className="font-heading font-semibold text-sm">
            Informasi
          </TabsTrigger>
          <TabsTrigger value="keluarga" className="font-heading font-semibold text-sm">
            Anggota Keluarga ({keluarga?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Info ────────────────────────────────────────────── */}
        <TabsContent value="info">
          {isEditing ? (
            <form
              onSubmit={handleSubmit(onSubmitEdit)}
              className="bg-white rounded-xl border border-stone-200 p-6 space-y-6"
            >
              <div>
                <h3 className="font-heading text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">
                  Informasi Akun
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Nama Lengkap" error={errors.name?.message}>
                    <Input {...register('name')} className="font-body" />
                  </FormField>
                  <FormField label="No. Telepon" error={errors.phone?.message}>
                    <Input {...register('phone')} className="font-body" />
                  </FormField>
                </div>
              </div>

              <div className="border-t border-stone-100" />

              <div>
                <h3 className="font-heading text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">
                  Data Kependudukan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="NIK" error={errors.nik?.message}>
                    <Input {...register('nik')} maxLength={16} className="font-mono" />
                  </FormField>
                  <FormField label="No. KK" error={errors.noKk?.message}>
                    <Input {...register('noKk')} maxLength={16} className="font-mono" />
                  </FormField>
                  <div className="sm:col-span-2">
                    <FormField label="Alamat" error={errors.alamat?.message}>
                      <Textarea {...register('alamat')} rows={3} className="font-body resize-none" />
                    </FormField>
                  </div>
                  <FormField label="Status Tinggal" error={errors.statusTinggal?.message}>
                    <Select
                      value={watch('statusTinggal') ?? warga.statusTinggal}
                      onValueChange={(v) => setValue('statusTinggal', v as StatusTinggal)}
                    >
                      <SelectTrigger className="font-body">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TETAP">Tetap</SelectItem>
                        <SelectItem value="KONTRAK">Kontrak</SelectItem>
                        <SelectItem value="KOST">Kost</SelectItem>
                        <SelectItem value="PINDAH">Pindah</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Tanggal Masuk" error={errors.tglMasuk?.message}>
                    <Input {...register('tglMasuk')} type="date" className="font-body" />
                  </FormField>
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
                  {updateMutation.isPending ? (
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                  ) : null}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <InfoRow label="Nama" value={warga.user.name} />
              <InfoRow label="Email" value={warga.user.email} />
              <InfoRow label="Telepon" value={warga.user.phone ?? '—'} />
              <InfoRow label="NIK" value={<span className="font-mono">{formatNIK(warga.nik)}</span>} />
              <InfoRow label="No. KK" value={<span className="font-mono">{formatNIK(warga.noKk)}</span>} />
              <InfoRow label="Alamat" value={warga.alamat} />
              <InfoRow label="Status Tinggal" value={<StatusBadge status={warga.statusTinggal} />} />
              <InfoRow label="Tgl Masuk" value={warga.tglMasuk ? formatTanggal(warga.tglMasuk) : '—'} />
              <InfoRow label="Tgl Daftar" value={formatTanggal(warga.createdAt)} />
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Keluarga ─────────────────────────────────────────── */}
        <TabsContent value="keluarga">
          <div className="mb-3 flex justify-end">
            {canManage && (
              <Button
                onClick={() => {
                  setEditingAnggota(null);
                  setKeluargaDialog(true);
                }}
                className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
              >
                <Plus size={14} className="mr-1.5" />
                Tambah Anggota
              </Button>
            )}
          </div>

          <DataTable
            columns={keluargaColumns}
            data={keluarga ?? []}
            isLoading={isLoadingKeluarga}
            emptyTitle="Belum ada anggota keluarga"
            emptyDescription="Tambahkan anggota keluarga warga ini"
            emptyAction={
              canManage ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingAnggota(null);
                    setKeluargaDialog(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 font-heading font-semibold"
                >
                  <UserSquare2 size={14} className="mr-1.5" />
                  Tambah Anggota
                </Button>
              ) : undefined
            }
          />
        </TabsContent>
      </Tabs>

      {/* Keluarga dialog */}
      <KeluargaDialog
        open={keluargaDialog}
        onOpenChange={(v) => {
          setKeluargaDialog(v);
          if (!v) setEditingAnggota(null);
        }}
        wargaId={params.id}
        editing={editingAnggota}
      />

      {/* Delete anggota confirm */}
      <ConfirmDialog
        open={!!deleteAnggotaId}
        onOpenChange={(open) => !open && setDeleteAnggotaId(null)}
        title="Hapus Anggota Keluarga"
        description="Data anggota keluarga ini akan dihapus permanen."
        onConfirm={() => {
          if (deleteAnggotaId) {
            deleteKeluargaMutation.mutate(deleteAnggotaId, {
              onSettled: () => setDeleteAnggotaId(null),
            });
          }
        }}
        loading={deleteKeluargaMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
