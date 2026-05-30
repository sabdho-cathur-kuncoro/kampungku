'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import {
  useSuratList,
  useSuratSaya,
  useAjukanSurat,
  JENIS_SURAT_LABEL,
  type SuratListParams,
} from '@/hooks/useSurat';
import { formatTanggalPendek } from '@/lib/utils';
import type { PermohonanSurat, JenisSurat, StatusSurat } from '@/types';

const CAN_APPROVE_ROLES = ['ADMIN', 'KETUA_RT', 'SUPER_ADMIN'] as const;

const STATUS_OPTIONS: { value: StatusSurat | ''; label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'DIAJUKAN', label: 'Diajukan' },
  { value: 'DISETUJUI', label: 'Disetujui' },
  { value: 'DITOLAK', label: 'Ditolak' },
];

// ─── Ajukan dialog ────────────────────────────────────────────────────────────

const ajukanSchema = z.object({
  jenisSurat: z.enum([
    'DOMISILI', 'KETERANGAN_TIDAK_MAMPU', 'KETERANGAN_USAHA',
    'PENGANTAR_KTP', 'PENGANTAR_KK', 'LAINNYA',
  ]),
  keperluan: z.string().min(10, 'Keperluan minimal 10 karakter').max(500),
});
type AjukanForm = z.infer<typeof ajukanSchema>;

function AjukanDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const ajukanMutation = useAjukanSurat();
  const router = useRouter();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<AjukanForm>({
    resolver: zodResolver(ajukanSchema),
    defaultValues: { jenisSurat: 'DOMISILI' },
  });

  const onSubmit = (values: AjukanForm) => {
    ajukanMutation.mutate(values, {
      onSuccess: (data) => {
        reset();
        onOpenChange(false);
        router.push(`/surat/${data.id}`);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold">Ajukan Permohonan Surat</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Jenis Surat <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch('jenisSurat')}
              onValueChange={(v) => setValue('jenisSurat', v as JenisSurat)}
            >
              <SelectTrigger className="font-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(JENIS_SURAT_LABEL).map(([val, label]) => (
                  <SelectItem key={val} value={val} className="font-body">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Keperluan <span className="text-red-500">*</span>
            </Label>
            <Textarea
              {...register('keperluan')}
              placeholder="Jelaskan keperluan pengajuan surat ini (minimal 10 karakter)..."
              rows={4}
              className="font-body resize-none"
            />
            {errors.keperluan && (
              <p className="text-xs text-red-500">{errors.keperluan.message}</p>
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
              disabled={ajukanMutation.isPending}
              className="bg-green-600 hover:bg-green-700 font-heading font-semibold"
            >
              {ajukanMutation.isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              Ajukan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Surat table ──────────────────────────────────────────────────────────────

function SuratTable({
  data,
  isLoading,
  meta,
  onPageChange,
  showWarga,
  emptyAction,
}: {
  data: PermohonanSurat[];
  isLoading: boolean;
  meta?: { page: number; limit: number; total: number; totalPages: number };
  onPageChange: (p: number) => void;
  showWarga: boolean;
  emptyAction?: React.ReactNode;
}) {
  const router = useRouter();

  const columns: Column<PermohonanSurat>[] = [
    ...(showWarga
      ? [{
          key: 'warga',
          header: 'Warga',
          render: (r: PermohonanSurat) => (
            <span className="font-semibold text-stone-900">{r.warga.user.name}</span>
          ),
        }]
      : []),
    {
      key: 'jenis',
      header: 'Jenis Surat',
      render: (r) => (
        <span className="font-body text-sm">{JENIS_SURAT_LABEL[r.jenisSurat]}</span>
      ),
    },
    {
      key: 'keperluan',
      header: 'Keperluan',
      width: 'w-52',
      render: (r) => (
        <span className="text-stone-600 line-clamp-2">{r.keperluan}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'noSurat',
      header: 'No. Surat',
      render: (r) => (
        <span className="font-mono text-xs text-stone-500">{r.noSurat ?? '—'}</span>
      ),
    },
    {
      key: 'tgl',
      header: 'Diajukan',
      render: (r) => (
        <span className="text-stone-500 text-xs">{formatTanggalPendek(r.tglDiajukan)}</span>
      ),
    },
    {
      key: 'aksi',
      header: '',
      width: 'w-16',
      render: (r) => (
        <button
          onClick={() => router.push(`/surat/${r.id}`)}
          className="text-xs text-blue-600 font-semibold hover:underline"
        >
          Detail
        </button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      meta={meta}
      onPageChange={onPageChange}
      emptyTitle="Belum ada permohonan surat"
      emptyDescription="Permohonan surat yang diajukan akan muncul di sini"
      emptyAction={emptyAction}
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SuratPage() {
  const { user } = useAuthStore();
  const canApprove = CAN_APPROVE_ROLES.includes(user?.role as (typeof CAN_APPROVE_ROLES)[number]);

  const [ajukanOpen, setAjukanOpen] = useState(false);

  // Admin list filters
  const [adminFilter, setAdminFilter] = useState<SuratListParams>({ page: 1, limit: 20 });
  // My list filters
  const [sayaFilter, setSayaFilter] = useState<SuratListParams>({ page: 1, limit: 20 });

  const { data: adminData, isLoading: adminLoading } = useSuratList(adminFilter);
  const { data: sayaData, isLoading: sayaLoading } = useSuratSaya(sayaFilter);

  const filterBar = (
    filter: SuratListParams,
    setFilter: (f: SuratListParams) => void,
  ) => (
    <div className="flex items-center gap-3 mb-4">
      <Select
        value={filter.status || 'ALL'}
        onValueChange={(v) =>
          setFilter({ ...filter, status: v === 'ALL' ? '' : (v as StatusSurat), page: 1 })
        }
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

      <Select
        value={filter.jenisSurat || 'ALL'}
        onValueChange={(v) =>
          setFilter({ ...filter, jenisSurat: v === 'ALL' ? '' : (v as JenisSurat), page: 1 })
        }
      >
        <SelectTrigger className="w-48 h-9 font-body text-sm">
          <SelectValue placeholder="Semua Jenis" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL" className="font-body text-sm">Semua Jenis</SelectItem>
          {Object.entries(JENIS_SURAT_LABEL).map(([val, label]) => (
            <SelectItem key={val} value={val} className="font-body text-sm">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Surat"
        description="Permohonan surat keterangan RT"
        action={
          <Button
            onClick={() => setAjukanOpen(true)}
            className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
          >
            <Plus size={14} className="mr-1.5" />
            Ajukan Surat
          </Button>
        }
      />

      {canApprove ? (
        <Tabs defaultValue="semua">
          <TabsList className="mb-4">
            <TabsTrigger value="semua" className="font-heading font-semibold text-sm">
              Semua Permohonan {adminData ? `(${adminData.meta?.total ?? 0})` : ''}
            </TabsTrigger>
            <TabsTrigger value="saya" className="font-heading font-semibold text-sm">
              Permohonan Saya {sayaData ? `(${sayaData.meta?.total ?? 0})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="semua">
            {filterBar(adminFilter, setAdminFilter)}
            <SuratTable
              data={adminData?.data ?? []}
              isLoading={adminLoading}
              meta={adminData?.meta}
              onPageChange={(p) => setAdminFilter((f) => ({ ...f, page: p }))}
              showWarga
            />
          </TabsContent>

          <TabsContent value="saya">
            {filterBar(sayaFilter, setSayaFilter)}
            <SuratTable
              data={sayaData?.data ?? []}
              isLoading={sayaLoading}
              meta={sayaData?.meta}
              onPageChange={(p) => setSayaFilter((f) => ({ ...f, page: p }))}
              showWarga={false}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {filterBar(sayaFilter, setSayaFilter)}
          <SuratTable
            data={sayaData?.data ?? []}
            isLoading={sayaLoading}
            meta={sayaData?.meta}
            onPageChange={(p) => setSayaFilter((f) => ({ ...f, page: p }))}
            showWarga={false}
            emptyAction={
              <Button
                size="sm"
                onClick={() => setAjukanOpen(true)}
                className="bg-green-600 hover:bg-green-700 font-heading font-semibold"
              >
                <FileText size={14} className="mr-1.5" />
                Ajukan Surat
              </Button>
            }
          />
        </>
      )}

      <AjukanDialog open={ajukanOpen} onOpenChange={setAjukanOpen} />
    </div>
  );
}
