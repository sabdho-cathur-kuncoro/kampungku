'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ApiResponse, Pengaduan, StatusPengaduan, PaginationMeta } from '@/types';

export const pengaduanKeys = {
  all: ['pengaduan'] as const,
  list: (p: PengaduanListParams) => ['pengaduan', 'list', p] as const,
  detail: (id: string) => ['pengaduan', 'detail', id] as const,
};

export interface PengaduanListParams {
  status?: StatusPengaduan | '';
  page?: number;
  limit?: number;
}

interface PengaduanListResponse {
  data: Pengaduan[];
  meta: PaginationMeta;
}

export function usePengaduanList(params: PengaduanListParams = {}) {
  return useQuery({
    queryKey: pengaduanKeys.list(params),
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params.status) q.set('status', params.status);
      if (params.page) q.set('page', String(params.page));
      if (params.limit) q.set('limit', String(params.limit));
      const { data } = await api.get<ApiResponse<Pengaduan[]>>(`/pengaduan?${q}`);
      return { data: data.data, meta: data.meta } as PengaduanListResponse;
    },
  });
}

export function usePengaduanDetail(id: string) {
  return useQuery({
    queryKey: pengaduanKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Pengaduan>>(`/pengaduan/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreatePengaduan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { judul: string; deskripsi: string; isAnonim?: boolean }) =>
      api.post<ApiResponse<Pengaduan>>('/pengaduan', payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pengaduanKeys.all });
      toast.success('Pengaduan berhasil dikirim');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal mengirim pengaduan';
      toast.error(msg);
    },
  });
}

export function useUpdateStatusPengaduan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      tanggapan,
    }: {
      id: string;
      status: StatusPengaduan;
      tanggapan?: string;
    }) =>
      api
        .put<ApiResponse<Pengaduan>>(`/pengaduan/${id}/status`, { status, tanggapan })
        .then((r) => r.data.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: pengaduanKeys.all });
      qc.setQueryData(pengaduanKeys.detail(data.id), data);
      toast.success('Status pengaduan diperbarui');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal memperbarui status';
      toast.error(msg);
    },
  });
}
