'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import {
  useSuratDetail,
  useApproveSurat,
  useTolakSurat,
  downloadSuratPDF,
  JENIS_SURAT_LABEL,
} from '@/hooks/useSurat';
import { formatTanggal, formatNIK } from '@/lib/utils';

const CAN_APPROVE_ROLES = ['ADMIN', 'KETUA_RT', 'SUPER_ADMIN'] as const;

// ─── Tolak dialog ─────────────────────────────────────────────────────────────

const tolakSchema = z.object({
  alasanTolak: z.string().min(5, 'Alasan minimal 5 karakter').max(500),
});
type TolakForm = z.infer<typeof tolakSchema>;

function TolakDialog({
  open,
  onOpenChange,
  suratId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  suratId: string;
}) {
  const tolakMutation = useTolakSurat();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TolakForm>({
    resolver: zodResolver(tolakSchema),
  });

  const onSubmit = (values: TolakForm) => {
    tolakMutation.mutate(
      { id: suratId, alasanTolak: values.alasanTolak },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold">Tolak Permohonan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Alasan Penolakan <span className="text-red-500">*</span>
            </Label>
            <Textarea
              {...register('alasanTolak')}
              placeholder="Jelaskan alasan penolakan..."
              rows={3}
              className="font-body resize-none"
            />
            {errors.alasanTolak && (
              <p className="text-xs text-red-500">{errors.alasanTolak.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-3">
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
              disabled={tolakMutation.isPending}
              className="bg-red-600 hover:bg-red-700 font-heading font-semibold"
            >
              {tolakMutation.isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              Tolak Permohonan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-3 border-b border-stone-100 last:border-0">
      <span className="font-heading text-xs font-semibold text-stone-500 uppercase tracking-wide w-40 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="font-body text-sm text-stone-800">{value}</span>
    </div>
  );
}

// ─── Status timeline ──────────────────────────────────────────────────────────

function StatusTimeline({ status }: { status: string }) {
  const steps = ['DIAJUKAN', 'DIPROSES', 'DISETUJUI'] as const;
  const isDitolak = status === 'DITOLAK';

  if (isDitolak) {
    return (
      <div className="flex items-center gap-2 py-3">
        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <XCircle size={14} className="text-red-600" />
        </div>
        <span className="font-heading text-sm font-semibold text-red-600">Ditolak</span>
      </div>
    );
  }

  const currentIdx = steps.indexOf(status as (typeof steps)[number]);

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-heading ${
                  done
                    ? 'bg-green-600 text-white'
                    : 'bg-stone-200 text-stone-400'
                } ${isCurrent ? 'ring-2 ring-green-200 ring-offset-1' : ''}`}
              >
                {i + 1}
              </div>
              <span
                className={`font-body text-xs mt-1 ${
                  done ? 'text-green-700 font-semibold' : 'text-stone-400'
                }`}
              >
                {step === 'DIAJUKAN' ? 'Diajukan' : step === 'DIPROSES' ? 'Diproses' : 'Disetujui'}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 w-12 mx-1 mb-4 ${i < currentIdx ? 'bg-green-500' : 'bg-stone-200'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SuratDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [approveOpen, setApproveOpen] = useState(false);
  const [tolakOpen, setTolakOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data, isLoading } = useSuratDetail(params.id);
  const approveMutation = useApproveSurat();

  const canApprove = CAN_APPROVE_ROLES.includes(user?.role as (typeof CAN_APPROVE_ROLES)[number]);
  const isOwner = data?.warga.user.id === user?.id;
  const canDownload = (canApprove || isOwner) && data?.status === 'DISETUJUI';
  const canAct = canApprove && data?.status === 'DIAJUKAN';

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadSuratPDF(params.id);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="font-heading font-semibold text-stone-500">Permohonan tidak ditemukan</p>
        <Button variant="outline" onClick={() => router.push('/surat')} className="mt-4 font-heading font-semibold">
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Detail Permohonan Surat"
        description={JENIS_SURAT_LABEL[data.jenisSurat]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/surat')}
              className="h-9 font-heading font-semibold text-sm"
            >
              <ArrowLeft size={14} className="mr-1.5" />
              Kembali
            </Button>
            {canDownload && (
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={isDownloading}
                className="h-9 font-heading font-semibold text-sm border-green-200 text-green-700 hover:bg-green-50"
              >
                {isDownloading
                  ? <Loader2 size={14} className="mr-1.5 animate-spin" />
                  : <Download size={14} className="mr-1.5" />}
                Unduh PDF
              </Button>
            )}
          </div>
        }
      />

      {/* Status timeline */}
      <div className="bg-white rounded-xl border border-stone-200 px-5 py-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-heading text-xs font-semibold text-stone-500 uppercase tracking-wide">
            Status Permohonan
          </span>
          <StatusBadge status={data.status} />
        </div>
        <StatusTimeline status={data.status} />
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 mb-4">
        <InfoRow label="Nama Warga" value={data.warga.user.name} />
        <InfoRow label="NIK" value={<span className="font-mono">{formatNIK(data.warga.nik)}</span>} />
        <InfoRow label="Alamat" value={data.warga.alamat} />
        <InfoRow label="Jenis Surat" value={JENIS_SURAT_LABEL[data.jenisSurat]} />
        <InfoRow
          label="Keperluan"
          value={<span className="whitespace-pre-wrap">{data.keperluan}</span>}
        />
        <InfoRow label="Tgl Diajukan" value={formatTanggal(data.tglDiajukan)} />
        {data.tglDiproses && (
          <InfoRow label="Tgl Diproses" value={formatTanggal(data.tglDiproses)} />
        )}
        {data.noSurat && (
          <InfoRow
            label="No. Surat"
            value={<span className="font-mono font-semibold text-green-700">{data.noSurat}</span>}
          />
        )}
        {data.approver && (
          <InfoRow label="Diproses oleh" value={data.approver.name} />
        )}
        {data.alasanTolak && (
          <InfoRow
            label="Alasan Ditolak"
            value={
              <span className="text-red-600 whitespace-pre-wrap">{data.alasanTolak}</span>
            }
          />
        )}
      </div>

      {/* Approve/reject actions */}
      {canAct && (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setApproveOpen(true)}
            className="flex-1 bg-green-600 hover:bg-green-700 font-heading font-semibold h-10"
          >
            <CheckCircle size={16} className="mr-2" />
            Setujui Permohonan
          </Button>
          <Button
            variant="outline"
            onClick={() => setTolakOpen(true)}
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 font-heading font-semibold h-10"
          >
            <XCircle size={16} className="mr-2" />
            Tolak Permohonan
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Setujui Permohonan"
        description={`Setujui permohonan ${JENIS_SURAT_LABEL[data.jenisSurat]} atas nama ${data.warga.user.name}? Nomor surat akan digenerate otomatis.`}
        confirmLabel="Setujui"
        variant="default"
        onConfirm={() =>
          approveMutation.mutate(params.id, { onSettled: () => setApproveOpen(false) })
        }
        loading={approveMutation.isPending}
      />

      <TolakDialog
        open={tolakOpen}
        onOpenChange={setTolakOpen}
        suratId={params.id}
      />
    </div>
  );
}
