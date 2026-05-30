'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ApiResponse, Pengumuman, KategoriPengumuman, PaginationMeta } from '@/types';

export const pengumumanKeys = {
  all: ['pengumuman'] as const,
  list: (p: PengumumanListParams) => ['pengumuman', 'list', p] as const,
  detail: (id: string) => ['pengumuman', 'detail', id] as const,
};

export interface PengumumanListParams {
  kategori?: KategoriPengumuman | '';
  isPinned?: boolean;
  page?: number;
  limit?: number;
}

export interface CreatePengumumanPayload {
  judul: string;
  konten: string;
  kategori?: KategoriPengumuman;
  tglMulai: string;
  tglSelesai?: string;
  isPinned?: boolean;
}

export interface UpdatePengumumanPayload extends Partial<CreatePengumumanPayload> {}

interface PengumumanListResponse {
  data: Pengumuman[];
  meta: PaginationMeta;
}

export function usePengumumanList(params: PengumumanListParams = {}) {
  return useQuery({
    queryKey: pengumumanKeys.list(params),
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params.kategori) q.set('kategori', params.kategori);
      if (params.isPinned !== undefined) q.set('isPinned', String(params.isPinned));
      if (params.page) q.set('page', String(params.page));
      if (params.limit) q.set('limit', String(params.limit));
      const { data } = await api.get<ApiResponse<Pengumuman[]>>(`/pengumuman?${q}`);
      return { data: data.data, meta: data.meta } as PengumumanListResponse;
    },
  });
}

export function usePengumumanDetail(id: string) {
  return useQuery({
    queryKey: pengumumanKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Pengumuman>>(`/pengumuman/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreatePengumuman() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePengumumanPayload) =>
      api.post<ApiResponse<Pengumuman>>('/pengumuman', payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pengumumanKeys.all });
      toast.success('Pengumuman berhasil dibuat');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal membuat pengumuman';
      toast.error(msg);
    },
  });
}

export function useUpdatePengumuman(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePengumumanPayload) =>
      api.put<ApiResponse<Pengumuman>>(`/pengumuman/${id}`, payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pengumumanKeys.all });
      toast.success('Pengumuman berhasil diupdate');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal mengupdate pengumuman';
      toast.error(msg);
    },
  });
}

export function useDeletePengumuman() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/pengumuman/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pengumumanKeys.all });
      toast.success('Pengumuman berhasil dihapus');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menghapus pengumuman';
      toast.error(msg);
    },
  });
}
