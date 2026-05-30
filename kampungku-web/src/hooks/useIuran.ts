'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ApiResponse, IuranTagihan, JenisIuran, StatusIuran } from '@/types';

// ─── Query keys ──────────────────────────────────────────────────────────────

export const iuranKeys = {
  all: ['iuran'] as const,
  list: (p: IuranListParams) => ['iuran', 'list', p] as const,
  byWarga: (id: string) => ['iuran', 'warga', id] as const,
  tunggakan: ['iuran', 'tunggakan'] as const,
  laporan: (p: LaporanParams) => ['iuran', 'laporan', p] as const,
  jenis: (aktif?: boolean) => ['jenis-iuran', aktif] as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IuranListParams {
  bulan?: number;
  tahun?: number;
  status?: StatusIuran | '';
}

export interface LaporanParams {
  bulan?: number;
  tahun?: number;
}

export interface LaporanData {
  totalTagihan: number;
  lunas: { count: number; total: number };
  menungguVerifikasi: { count: number; total: number };
  belumBayar: { count: number; total: number };
}

export interface CreateTagihanPayload {
  wargaId: string;
  jenisIuranId: string;
  bulan: number;
  tahun: number;
  jumlah?: number;
  catatan?: string;
}

// ─── Iuran list ───────────────────────────────────────────────────────────────

export function useIuranList(params: IuranListParams = {}) {
  return useQuery({
    queryKey: iuranKeys.list(params),
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params.bulan) q.set('bulan', String(params.bulan));
      if (params.tahun) q.set('tahun', String(params.tahun));
      if (params.status) q.set('status', params.status);
      const { data } = await api.get<ApiResponse<IuranTagihan[]>>(`/iuran?${q}`);
      return data.data;
    },
  });
}

export function useTunggakan() {
  return useQuery({
    queryKey: iuranKeys.tunggakan,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<IuranTagihan[]>>('/iuran/tunggakan');
      return data.data;
    },
  });
}

export function useIuranByWarga(wargaId: string) {
  return useQuery({
    queryKey: iuranKeys.byWarga(wargaId),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<IuranTagihan[]>>(`/iuran/warga/${wargaId}`);
      return data.data;
    },
    enabled: !!wargaId,
  });
}

export function useLaporan(params: LaporanParams = {}) {
  return useQuery({
    queryKey: iuranKeys.laporan(params),
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params.bulan) q.set('bulan', String(params.bulan));
      if (params.tahun) q.set('tahun', String(params.tahun));
      const { data } = await api.get<ApiResponse<LaporanData>>(`/iuran/laporan?${q}`);
      return data.data;
    },
  });
}

// ─── Jenis iuran ──────────────────────────────────────────────────────────────

export function useJenisIuranList(aktifOnly = true) {
  return useQuery({
    queryKey: iuranKeys.jenis(aktifOnly),
    queryFn: async () => {
      const q = aktifOnly ? '?aktif=true' : '';
      const { data } = await api.get<ApiResponse<JenisIuran[]>>(`/jenis-iuran${q}`);
      return data.data;
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateTagihan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTagihanPayload) =>
      api.post<ApiResponse<IuranTagihan>>('/iuran/tagihan', payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: iuranKeys.all });
      toast.success('Tagihan berhasil dibuat');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal membuat tagihan';
      toast.error(msg);
    },
  });
}

export function useBayarIuran() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tagihanId, catatan }: { tagihanId: string; catatan?: string }) =>
      api.post<ApiResponse<IuranTagihan>>('/iuran/bayar', { tagihanId, catatan }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: iuranKeys.all });
      toast.success('Pembayaran dikonfirmasi, menunggu verifikasi bendahara');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal mengkonfirmasi pembayaran';
      toast.error(msg);
    },
  });
}

export function useVerifikasiIuran() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      approve,
      catatan,
    }: {
      id: string;
      approve: boolean;
      catatan?: string;
    }) =>
      api
        .put<ApiResponse<IuranTagihan>>(`/iuran/${id}/verifikasi`, { approve, catatan })
        .then((r) => r.data.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: iuranKeys.all });
      toast.success(vars.approve ? 'Pembayaran diverifikasi — LUNAS' : 'Pembayaran ditolak');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal memverifikasi pembayaran';
      toast.error(msg);
    },
  });
}
