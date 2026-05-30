'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pin, Bell } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import { usePengumumanList, useDeletePengumuman } from '@/hooks/usePengumuman';
import { formatTanggalPendek } from '@/lib/utils';
import type { KategoriPengumuman, Pengumuman } from '@/types';

const KATEGORI_OPTIONS: { value: KategoriPengumuman | ''; label: string }[] = [
  { value: '', label: 'Semua Kategori' },
  { value: 'UMUM', label: 'Umum' },
  { value: 'KEGIATAN', label: 'Kegiatan' },
  { value: 'KEUANGAN', label: 'Keuangan' },
  { value: 'DARURAT', label: 'Darurat' },
];

const CAN_CREATE_ROLES = ['ADMIN', 'KETUA_RT', 'SEKRETARIS', 'SUPER_ADMIN'] as const;

function PengumumanCard({
  item,
  canEdit,
  onEdit,
  onDelete,
}: {
  item: Pengumuman;
  canEdit: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();

  return (
    <div
      className={`bg-white rounded-xl border ${item.isPinned ? 'border-green-200 shadow-sm' : 'border-stone-200'} p-5 flex flex-col gap-3`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {item.isPinned && (
            <Pin size={14} className="text-green-600 mt-0.5 shrink-0" />
          )}
          <button
            onClick={() => router.push(`/pengumuman/${item.id}`)}
            className="font-heading font-bold text-stone-900 hover:text-green-700 transition-colors text-left leading-tight line-clamp-2"
          >
            {item.judul}
          </button>
        </div>
        <StatusBadge status={item.kategori} className="shrink-0" />
      </div>

      {/* Konten preview */}
      <p className="font-body text-sm text-stone-600 line-clamp-3 leading-relaxed">
        {item.konten}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-stone-100">
        <div className="flex flex-col gap-0.5">
          <span className="font-body text-xs text-stone-500">
            Mulai: {formatTanggalPendek(item.tglMulai)}
            {item.tglSelesai && ` · Selesai: ${formatTanggalPendek(item.tglSelesai)}`}
          </span>
          <span className="font-body text-xs text-stone-400">
            oleh {item.author.name}
          </span>
        </div>

        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onEdit(item.id)}
              className="font-heading text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="font-heading text-xs font-semibold text-red-400 hover:text-red-600 transition-colors"
            >
              Hapus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex justify-between pt-1 border-t border-stone-100">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export default function PengumumanPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [kategori, setKategori] = useState<KategoriPengumuman | ''>('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canCreate = CAN_CREATE_ROLES.includes(user?.role as (typeof CAN_CREATE_ROLES)[number]);

  const { data, isLoading } = usePengumumanList({ kategori: kategori || undefined, page, limit: 12 });
  const deleteMutation = useDeletePengumuman();

  const canEdit = (item: Pengumuman) =>
    canCreate || item.author.id === user?.id;

  return (
    <div>
      <PageHeader
        title="Pengumuman"
        description="Informasi dan kegiatan RT"
        action={
          canCreate ? (
            <Button
              onClick={() => router.push('/pengumuman/tambah')}
              className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
            >
              <Plus size={14} className="mr-1.5" />
              Buat Pengumuman
            </Button>
          ) : undefined
        }
      />

      {/* Filter */}
      <div className="flex items-center gap-3 mb-5">
        <Select
          value={kategori || 'ALL'}
          onValueChange={(v) => {
            setKategori(v === 'ALL' ? '' : (v as KategoriPengumuman));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44 h-9 font-body text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KATEGORI_OPTIONS.map((o) => (
              <SelectItem key={o.value || 'ALL'} value={o.value || 'ALL'} className="font-body text-sm">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Card grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center">
            <Bell size={20} className="text-stone-400" />
          </div>
          <p className="font-heading font-semibold text-stone-500">Belum ada pengumuman</p>
          {canCreate && (
            <Button
              size="sm"
              onClick={() => router.push('/pengumuman/tambah')}
              className="bg-green-600 hover:bg-green-700 font-heading font-semibold mt-1"
            >
              Buat Pengumuman Pertama
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.data.map((item) => (
            <PengumumanCard
              key={item.id}
              item={item}
              canEdit={canEdit(item)}
              onEdit={(id) => router.push(`/pengumuman/${id}?edit=1`)}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 px-1">
          <p className="font-body text-xs text-stone-500">
            {data.meta.total} pengumuman · halaman {data.meta.page} dari {data.meta.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="font-heading font-semibold h-8"
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="font-heading font-semibold h-8"
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Hapus Pengumuman"
        description="Pengumuman ini akan dihapus permanen."
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, { onSettled: () => setDeleteId(null) });
          }
        }}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
