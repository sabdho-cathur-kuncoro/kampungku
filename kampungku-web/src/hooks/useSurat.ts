'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ApiResponse, PermohonanSurat, JenisSurat, StatusSurat, PaginationMeta } from '@/types';

export const suratKeys = {
  all: ['surat'] as const,
  list: (p: SuratListParams) => ['surat', 'list', p] as const,
  saya: (p: SuratListParams) => ['surat', 'saya', p] as const,
  detail: (id: string) => ['surat', 'detail', id] as const,
};

export interface SuratListParams {
  status?: StatusSurat | '';
  jenisSurat?: JenisSurat | '';
  page?: number;
  limit?: number;
}

interface SuratListResponse {
  data: PermohonanSurat[];
  meta: PaginationMeta;
}

function buildQuery(params: SuratListParams) {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.jenisSurat) q.set('jenisSurat', params.jenisSurat);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  return q.toString();
}

export function useSuratList(params: SuratListParams = {}) {
  return useQuery({
    queryKey: suratKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PermohonanSurat[]>>(`/surat?${buildQuery(params)}`);
      return { data: data.data, meta: data.meta } as SuratListResponse;
    },
  });
}

export function useSuratSaya(params: SuratListParams = {}) {
  return useQuery({
    queryKey: suratKeys.saya(params),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PermohonanSurat[]>>(`/surat/saya?${buildQuery(params)}`);
      return { data: data.data, meta: data.meta } as SuratListResponse;
    },
  });
}

export function useSuratDetail(id: string) {
  return useQuery({
    queryKey: suratKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PermohonanSurat>>(`/surat/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useAjukanSurat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jenisSurat, keperluan }: { jenisSurat: JenisSurat; keperluan: string }) =>
      api.post<ApiResponse<PermohonanSurat>>('/surat/ajukan', { jenisSurat, keperluan }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: suratKeys.all });
      toast.success('Permohonan surat berhasil diajukan');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal mengajukan permohonan surat';
      toast.error(msg);
    },
  });
}

export function useApproveSurat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.put<ApiResponse<PermohonanSurat>>(`/surat/${id}/approve`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: suratKeys.all });
      toast.success('Permohonan surat disetujui');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menyetujui permohonan';
      toast.error(msg);
    },
  });
}

export function useTolakSurat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, alasanTolak }: { id: string; alasanTolak: string }) =>
      api.put<ApiResponse<PermohonanSurat>>(`/surat/${id}/tolak`, { alasanTolak }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: suratKeys.all });
      toast.success('Permohonan surat ditolak');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menolak permohonan';
      toast.error(msg);
    },
  });
}

export async function downloadSuratPDF(id: string): Promise<void> {
  const res = await api.get(`/surat/${id}/download`, { responseType: 'blob' });
  const blob = new Blob([res.data as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `surat-${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export const JENIS_SURAT_LABEL: Record<JenisSurat, string> = {
  DOMISILI: 'Surat Domisili',
  KETERANGAN_TIDAK_MAMPU: 'Keterangan Tidak Mampu',
  KETERANGAN_USAHA: 'Keterangan Usaha',
  PENGANTAR_KTP: 'Pengantar KTP',
  PENGANTAR_KK: 'Pengantar KK',
  LAINNYA: 'Lainnya',
};
