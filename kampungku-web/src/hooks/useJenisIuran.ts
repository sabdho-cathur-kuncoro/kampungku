'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ApiResponse, JenisIuran } from '@/types';

export const jenisIuranKeys = {
  all: ['jenis-iuran'] as const,
  list: (aktif?: boolean) => ['jenis-iuran', 'list', aktif] as const,
};

export function useJenisIuranList(aktifOnly?: boolean) {
  return useQuery({
    queryKey: jenisIuranKeys.list(aktifOnly),
    queryFn: async () => {
      const q = aktifOnly !== undefined ? `?aktif=${aktifOnly}` : '';
      const { data } = await api.get<ApiResponse<JenisIuran[]>>(`/jenis-iuran${q}`);
      return data.data;
    },
  });
}

export function useCreateJenisIuran() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { nama: string; jumlah: number; keterangan?: string }) =>
      api.post<ApiResponse<JenisIuran>>('/jenis-iuran', payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jenisIuranKeys.all });
      toast.success('Jenis iuran berhasil ditambahkan');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menambahkan jenis iuran';
      toast.error(msg);
    },
  });
}

export function useUpdateJenisIuran(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { nama?: string; jumlah?: number; keterangan?: string; isAktif?: boolean }) =>
      api.put<ApiResponse<JenisIuran>>(`/jenis-iuran/${id}`, payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jenisIuranKeys.all });
      toast.success('Jenis iuran berhasil diperbarui');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal memperbarui jenis iuran';
      toast.error(msg);
    },
  });
}

export function useDeleteJenisIuran() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/jenis-iuran/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jenisIuranKeys.all });
      toast.success('Jenis iuran berhasil dihapus');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menghapus jenis iuran — mungkin masih ada tagihan terkait';
      toast.error(msg);
    },
  });
}
