'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Plus, BarChart2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import {
  useIuranList,
  useTunggakan,
  useCreateTagihan,
  useBayarIuran,
  useVerifikasiIuran,
  useJenisIuranList,
  type IuranListParams,
  type CreateTagihanPayload,
} from '@/hooks/useIuran';
import { formatRupiah, formatTanggalPendek } from '@/lib/utils';
import type { IuranTagihan, StatusIuran } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const BULAN_LABEL = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const now = new Date();
const THIS_YEAR = now.getFullYear();
const THIS_MONTH = now.getMonth() + 1;
const YEARS = Array.from({ length: 5 }, (_, i) => THIS_YEAR - 2 + i);

// ─── Create tagihan schema ────────────────────────────────────────────────────

const createSchema = z.object({
  wargaId: z.string().uuid('Pilih warga'),
  jenisIuranId: z.string().uuid('Pilih jenis iuran'),
  bulan: z.number().int().min(1).max(12),
  tahun: z.number().int().min(2020).max(2100),
  jumlah: z.number().positive().optional(),
  catatan: z.string().max(500).optional(),
});
type CreateForm = z.infer<typeof createSchema>;

// ─── Create tagihan dialog ────────────────────────────────────────────────────

function CreateTagihanDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createMutation = useCreateTagihan();
  const { data: jenis } = useJenisIuranList(true);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { bulan: THIS_MONTH, tahun: THIS_YEAR },
  });

  const onSubmit = (values: CreateForm) => {
    const payload: CreateTagihanPayload = {
      wargaId: values.wargaId,
      jenisIuranId: values.jenisIuranId,
      bulan: values.bulan,
      tahun: values.tahun,
      jumlah: values.jumlah,
      catatan: values.catatan,
    };
    createMutation.mutate(payload, {
      onSuccess: () => {
        reset({ bulan: THIS_MONTH, tahun: THIS_YEAR });
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold">Buat Tagihan Iuran</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              ID Warga <span className="text-red-500">*</span>
            </Label>
            <Input
              {...register('wargaId')}
              placeholder="UUID warga"
              className="font-mono text-sm"
            />
            {errors.wargaId && <p className="text-xs text-red-500">{errors.wargaId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Jenis Iuran <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch('jenisIuranId') ?? ''}
              onValueChange={(v) => setValue('jenisIuranId', v)}
            >
              <SelectTrigger className="font-body">
                <SelectValue placeholder="Pilih jenis iuran..." />
              </SelectTrigger>
              <SelectContent>
                {jenis?.map((j) => (
                  <SelectItem key={j.id} value={j.id} className="font-body">
                    {j.nama} — {formatRupiah(j.jumlah)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.jenisIuranId && <p className="text-xs text-red-500">{errors.jenisIuranId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-heading text-sm font-semibold text-stone-700">
                Bulan <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(watch('bulan') ?? THIS_MONTH)}
                onValueChange={(v) => setValue('bulan', Number(v))}
              >
                <SelectTrigger className="font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BULAN_LABEL.slice(1).map((label, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)} className="font-body">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-heading text-sm font-semibold text-stone-700">
                Tahun <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(watch('tahun') ?? THIS_YEAR)}
                onValueChange={(v) => setValue('tahun', Number(v))}
              >
                <SelectTrigger className="font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)} className="font-body">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Jumlah Override (opsional)
            </Label>
            <Input
              type="number"
              placeholder="Kosongkan untuk pakai tarif default"
              className="font-body"
              onChange={(e) =>
                setValue('jumlah', e.target.value ? Number(e.target.value) : undefined)
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">Catatan</Label>
            <Input {...register('catatan')} placeholder="Opsional" className="font-body" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-heading font-semibold">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-green-600 hover:bg-green-700 font-heading font-semibold"
            >
              {createMutation.isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              Buat Tagihan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bayar dialog ─────────────────────────────────────────────────────────────

function BayarDialog({
  tagihan,
  onClose,
}: {
  tagihan: IuranTagihan | null;
  onClose: () => void;
}) {
  const bayarMutation = useBayarIuran();
  if (!tagihan) return null;
  return (
    <ConfirmDialog
      open={!!tagihan}
      onOpenChange={(v) => !v && onClose()}
      title="Konfirmasi Pembayaran"
      description={`Konfirmasi pembayaran ${tagihan.jenisIuran.nama} ${BULAN_LABEL[tagihan.bulan]} ${tagihan.tahun} sebesar ${formatRupiah(tagihan.jumlah)}? Status akan berubah ke Menunggu Verifikasi.`}
      confirmLabel="Bayar"
      variant="default"
      onConfirm={() =>
        bayarMutation.mutate(
          { tagihanId: tagihan.id },
          { onSettled: onClose },
        )
      }
      loading={bayarMutation.isPending}
    />
  );
}

// ─── Verifikasi dialog ────────────────────────────────────────────────────────

function VerifikasiDialog({
  tagihan,
  onClose,
}: {
  tagihan: IuranTagihan | null;
  onClose: () => void;
}) {
  const verifikasiMutation = useVerifikasiIuran();
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);

  if (!tagihan) return null;

  return (
    <Dialog open={!!tagihan} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold">Verifikasi Pembayaran</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="bg-stone-50 rounded-lg p-3 space-y-1 font-body text-sm">
            <p><span className="font-semibold text-stone-600">Warga:</span> {tagihan.warga.user.name}</p>
            <p><span className="font-semibold text-stone-600">Iuran:</span> {tagihan.jenisIuran.nama}</p>
            <p><span className="font-semibold text-stone-600">Periode:</span> {BULAN_LABEL[tagihan.bulan]} {tagihan.tahun}</p>
            <p><span className="font-semibold text-stone-600">Jumlah:</span> {formatRupiah(tagihan.jumlah)}</p>
            {tagihan.tglBayar && (
              <p><span className="font-semibold text-stone-600">Tgl Bayar:</span> {formatTanggalPendek(tagihan.tglBayar)}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 font-heading font-semibold"
              disabled={verifikasiMutation.isPending}
              onClick={() => {
                setMode('approve');
                verifikasiMutation.mutate(
                  { id: tagihan.id, approve: true },
                  { onSettled: onClose },
                );
              }}
            >
              {verifikasiMutation.isPending && mode === 'approve'
                ? <Loader2 size={14} className="mr-1.5 animate-spin" />
                : null}
              Setujui — LUNAS
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 font-heading font-semibold"
              disabled={verifikasiMutation.isPending}
              onClick={() => {
                setMode('reject');
                verifikasiMutation.mutate(
                  { id: tagihan.id, approve: false },
                  { onSettled: onClose },
                );
              }}
            >
              {verifikasiMutation.isPending && mode === 'reject'
                ? <Loader2 size={14} className="mr-1.5 animate-spin" />
                : null}
              Tolak
            </Button>
          </div>
          <Button variant="ghost" className="w-full font-heading font-semibold text-stone-500" onClick={onClose}>
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tagihan table ────────────────────────────────────────────────────────────

function TagihanTable({
  data,
  isLoading,
  canManage,
  userId,
  onBayar,
  onVerifikasi,
}: {
  data: IuranTagihan[];
  isLoading: boolean;
  canManage: boolean;
  userId?: string;
  onBayar: (t: IuranTagihan) => void;
  onVerifikasi: (t: IuranTagihan) => void;
}) {
  const columns: Column<IuranTagihan>[] = [
    {
      key: 'warga',
      header: 'Warga',
      render: (r) => <span className="font-semibold text-stone-900">{r.warga.user.name}</span>,
    },
    {
      key: 'jenis',
      header: 'Jenis Iuran',
      render: (r) => r.jenisIuran.nama,
    },
    {
      key: 'periode',
      header: 'Periode',
      render: (r) => (
        <span className="font-heading text-xs font-semibold text-stone-600">
          {BULAN_LABEL[r.bulan]} {r.tahun}
        </span>
      ),
    },
    {
      key: 'jumlah',
      header: 'Jumlah',
      render: (r) => (
        <span className="font-mono text-sm font-semibold">{formatRupiah(r.jumlah)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'tglBayar',
      header: 'Tgl Bayar',
      render: (r) => (
        <span className="text-stone-500 text-xs">
          {r.tglBayar ? formatTanggalPendek(r.tglBayar) : '—'}
        </span>
      ),
    },
    {
      key: 'aksi',
      header: 'Aksi',
      width: 'w-28',
      render: (r) => {
        const isOwner = r.warga.user.id === userId;
        const canBayar = r.status === 'BELUM_BAYAR' && (isOwner || canManage);
        const canVerify = r.status === 'MENUNGGU_VERIFIKASI' && canManage;
        return (
          <div className="flex items-center gap-2">
            {canBayar && (
              <button
                onClick={() => onBayar(r)}
                className="text-xs text-green-700 font-semibold hover:underline"
              >
                Bayar
              </button>
            )}
            {canVerify && (
              <button
                onClick={() => onVerifikasi(r)}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                Verifikasi
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      emptyTitle="Tidak ada tagihan"
      emptyDescription="Belum ada data tagihan iuran untuk filter ini"
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function IuranPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canManage = user?.role === 'ADMIN' || user?.role === 'BENDAHARA';

  const [filter, setFilter] = useState<IuranListParams>({
    bulan: THIS_MONTH,
    tahun: THIS_YEAR,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [bayarTarget, setBayarTarget] = useState<IuranTagihan | null>(null);
  const [verifikasiTarget, setVerifikasiTarget] = useState<IuranTagihan | null>(null);

  const { data: semua, isLoading: isLoadingSemua } = useIuranList(filter);
  const { data: menunggu, isLoading: isLoadingMenunggu } = useIuranList({
    ...filter,
    status: 'MENUNGGU_VERIFIKASI',
  });
  const { data: tunggakan, isLoading: isLoadingTunggakan } = useTunggakan();

  const updateFilter = (key: keyof IuranListParams, val: string) => {
    setFilter((prev) => ({
      ...prev,
      [key]: val === 'ALL' || val === '' ? undefined : key === 'bulan' || key === 'tahun' ? Number(val) : val,
    }));
  };

  return (
    <div>
      <PageHeader
        title="Iuran"
        description="Kelola tagihan dan pembayaran iuran warga"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/iuran/laporan')}
              className="h-9 font-heading font-semibold text-sm"
            >
              <BarChart2 size={14} className="mr-1.5" />
              Laporan
            </Button>
            {canManage && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
              >
                <Plus size={14} className="mr-1.5" />
                Buat Tagihan
              </Button>
            )}
          </div>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select
          value={filter.bulan ? String(filter.bulan) : 'ALL'}
          onValueChange={(v) => updateFilter('bulan', v)}
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
          value={filter.tahun ? String(filter.tahun) : 'ALL'}
          onValueChange={(v) => updateFilter('tahun', v)}
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

      <Tabs defaultValue="semua">
        <TabsList className="mb-4">
          <TabsTrigger value="semua" className="font-heading font-semibold text-sm">
            Semua {semua ? `(${semua.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="menunggu" className="font-heading font-semibold text-sm">
            Menunggu Verifikasi {menunggu ? `(${menunggu.length})` : ''}
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="tunggakan" className="font-heading font-semibold text-sm">
              Tunggakan {tunggakan ? `(${tunggakan.length})` : ''}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="semua">
          <TagihanTable
            data={semua ?? []}
            isLoading={isLoadingSemua}
            canManage={canManage}
            userId={user?.id}
            onBayar={setBayarTarget}
            onVerifikasi={setVerifikasiTarget}
          />
        </TabsContent>

        <TabsContent value="menunggu">
          <TagihanTable
            data={menunggu ?? []}
            isLoading={isLoadingMenunggu}
            canManage={canManage}
            userId={user?.id}
            onBayar={setBayarTarget}
            onVerifikasi={setVerifikasiTarget}
          />
        </TabsContent>

        {canManage && (
          <TabsContent value="tunggakan">
            <TagihanTable
              data={tunggakan ?? []}
              isLoading={isLoadingTunggakan}
              canManage={canManage}
              userId={user?.id}
              onBayar={setBayarTarget}
              onVerifikasi={setVerifikasiTarget}
            />
          </TabsContent>
        )}
      </Tabs>

      <CreateTagihanDialog open={createOpen} onOpenChange={setCreateOpen} />
      <BayarDialog tagihan={bayarTarget} onClose={() => setBayarTarget(null)} />
      <VerifikasiDialog tagihan={verifikasiTarget} onClose={() => setVerifikasiTarget(null)} />
    </div>
  );
}
