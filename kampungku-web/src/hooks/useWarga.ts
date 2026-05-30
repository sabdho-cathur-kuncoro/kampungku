'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ApiResponse, Warga, AnggotaKeluarga, PaginationMeta, StatusTinggal } from '@/types';

// ─── Query keys ──────────────────────────────────────────────────────────────

export const wargaKeys = {
  all: ['warga'] as const,
  list: (params: WargaListParams) => ['warga', 'list', params] as const,
  detail: (id: string) => ['warga', 'detail', id] as const,
  keluarga: (id: string) => ['warga', 'keluarga', id] as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WargaListParams {
  search?: string;
  status?: StatusTinggal | '';
  page?: number;
  limit?: number;
}

export interface CreateWargaPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  nik: string;
  noKk: string;
  alamat: string;
  statusTinggal?: StatusTinggal;
  tglMasuk?: string;
}

export interface UpdateWargaPayload {
  name?: string;
  phone?: string;
  nik?: string;
  noKk?: string;
  alamat?: string;
  statusTinggal?: StatusTinggal;
  tglMasuk?: string;
}

export interface CreateKeluargaPayload {
  nama: string;
  nik: string;
  hubungan: string;
  tglLahir: string;
  jenisKelamin: 'L' | 'P';
  pekerjaan?: string;
  pendidikan?: string;
}

export interface UpdateKeluargaPayload extends Partial<CreateKeluargaPayload> {}

interface WargaListResponse {
  data: Warga[];
  meta: PaginationMeta;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useWargaList(params: WargaListParams = {}) {
  return useQuery({
    queryKey: wargaKeys.list(params),
    queryFn: async () => {
      const { search, status, page = 1, limit = 20 } = params;
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (status) query.set('status', status);
      query.set('page', String(page));
      query.set('limit', String(limit));

      const { data } = await api.get<ApiResponse<Warga[]>>(`/warga?${query}`);
      return { data: data.data, meta: data.meta } as WargaListResponse;
    },
  });
}

export function useWargaDetail(id: string) {
  return useQuery({
    queryKey: wargaKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Warga>>(`/warga/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useKeluarga(wargaId: string) {
  return useQuery({
    queryKey: wargaKeys.keluarga(wargaId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AnggotaKeluarga[]>>(`/warga/${wargaId}/keluarga`);
      return data.data;
    },
    enabled: !!wargaId,
  });
}

export function useCreateWarga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWargaPayload) =>
      api.post<ApiResponse<Warga>>('/warga', payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wargaKeys.all });
      toast.success('Warga berhasil ditambahkan');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menambahkan warga';
      toast.error(msg);
    },
  });
}

export function useUpdateWarga(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateWargaPayload) =>
      api.put<ApiResponse<Warga>>(`/warga/${id}`, payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wargaKeys.all });
      toast.success('Data warga berhasil diupdate');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal mengupdate data warga';
      toast.error(msg);
    },
  });
}

export function useDeleteWarga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/warga/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wargaKeys.all });
      toast.success('Warga berhasil dihapus');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menghapus warga';
      toast.error(msg);
    },
  });
}

export function useCreateKeluarga(wargaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateKeluargaPayload) =>
      api
        .post<ApiResponse<AnggotaKeluarga>>(`/warga/${wargaId}/keluarga`, payload)
        .then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wargaKeys.keluarga(wargaId) });
      toast.success('Anggota keluarga berhasil ditambahkan');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menambahkan anggota keluarga';
      toast.error(msg);
    },
  });
}

export function useUpdateKeluarga(wargaId: string, kid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateKeluargaPayload) =>
      api
        .put<ApiResponse<AnggotaKeluarga>>(`/warga/${wargaId}/keluarga/${kid}`, payload)
        .then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wargaKeys.keluarga(wargaId) });
      toast.success('Anggota keluarga berhasil diupdate');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal mengupdate anggota keluarga';
      toast.error(msg);
    },
  });
}

export function useDeleteKeluarga(wargaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kid: string) => api.delete(`/warga/${wargaId}/keluarga/${kid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wargaKeys.keluarga(wargaId) });
      toast.success('Anggota keluarga berhasil dihapus');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menghapus anggota keluarga';
      toast.error(msg);
    },
  });
}
