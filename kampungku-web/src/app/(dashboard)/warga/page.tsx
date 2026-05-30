'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Download, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/authStore';
import { useWargaList, useDeleteWarga } from '@/hooks/useWarga';
import { formatNIK, formatTanggal } from '@/lib/utils';
import api from '@/lib/api';
import type { Warga, StatusTinggal } from '@/types';

const STATUS_OPTIONS: { value: StatusTinggal | ''; label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'TETAP', label: 'Tetap' },
  { value: 'KONTRAK', label: 'Kontrak' },
  { value: 'KOST', label: 'Kost' },
  { value: 'PINDAH', label: 'Pindah' },
];

export default function WargaPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<StatusTinggal | ''>('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useWargaList({ search, status: status || undefined, page, limit: 20 });
  const deleteMutation = useDeleteWarga();

  const canManage = user?.role === 'ADMIN' || user?.role === 'KETUA_RT';
  const canDelete = user?.role === 'ADMIN';

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleStatusChange = (val: string) => {
    setStatus(val === 'ALL' ? '' : (val as StatusTinggal));
    setPage(1);
  };

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    setIsExporting(true);
    try {
      const query = new URLSearchParams({ format });
      if (status) query.set('status', status);
      const res = await api.get(`/warga/export?${query}`, { responseType: 'blob' });
      const ext = format === 'xlsx' ? 'xlsx' : 'pdf';
      const mime =
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf';
      const blob = new Blob([res.data as BlobPart], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-warga.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // error handled by interceptor toast
    } finally {
      setIsExporting(false);
    }
  };

  const columns: Column<Warga>[] = [
    {
      key: 'nama',
      header: 'Nama',
      render: (row) => (
        <button
          onClick={() => router.push(`/warga/${row.id}`)}
          className="font-semibold text-stone-900 hover:text-green-700 transition-colors text-left"
        >
          {row.user.name}
        </button>
      ),
    },
    {
      key: 'nik',
      header: 'NIK',
      render: (row) => <span className="font-mono text-xs">{formatNIK(row.nik)}</span>,
    },
    {
      key: 'alamat',
      header: 'Alamat',
      width: 'w-48',
      render: (row) => (
        <span className="line-clamp-2 text-stone-600">{row.alamat}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.statusTinggal} />,
    },
    {
      key: 'tglMasuk',
      header: 'Tgl Masuk',
      render: (row) => (
        <span className="text-stone-500">{row.tglMasuk ? formatTanggal(row.tglMasuk) : '—'}</span>
      ),
    },
    {
      key: 'aksi',
      header: 'Aksi',
      width: 'w-24',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/warga/${row.id}`)}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            Detail
          </button>
          {canManage && (
            <button
              onClick={() => router.push(`/warga/${row.id}?edit=1`)}
              className="text-xs text-stone-500 hover:underline font-semibold"
            >
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setDeleteId(row.id)}
              className="text-xs text-red-500 hover:underline font-semibold"
            >
              Hapus
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Data Warga"
        description="Kelola data warga RT"
        action={
          canManage ? (
            <Button
              onClick={() => router.push('/warga/tambah')}
              className="bg-green-600 hover:bg-green-700 font-heading font-semibold h-9"
            >
              <Plus size={16} className="mr-1.5" />
              Tambah Warga
            </Button>
          ) : undefined
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Cari nama, NIK, alamat..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-8 h-9 font-body text-sm"
            />
          </div>
          <Button variant="outline" onClick={handleSearch} className="h-9 font-heading font-semibold text-sm">
            Cari
          </Button>
        </div>

        <Select value={status || 'ALL'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40 h-9 font-body text-sm">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value || 'ALL'} value={o.value || 'ALL'} className="font-body text-sm">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('xlsx')}
            disabled={isExporting}
            className="h-9 font-heading font-semibold text-sm"
          >
            <Download size={14} className="mr-1.5" />
            Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="h-9 font-heading font-semibold text-sm"
          >
            <Download size={14} className="mr-1.5" />
            PDF
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={setPage}
        emptyTitle="Belum ada data warga"
        emptyDescription="Tambahkan warga baru untuk memulai"
        emptyAction={
          canManage ? (
            <Button
              size="sm"
              onClick={() => router.push('/warga/tambah')}
              className="bg-green-600 hover:bg-green-700 font-heading font-semibold"
            >
              <Users size={14} className="mr-1.5" />
              Tambah Warga
            </Button>
          ) : undefined
        }
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Hapus Warga"
        description="Data warga ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSettled: () => setDeleteId(null),
            });
          }
        }}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
