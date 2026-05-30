'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { ApiResponse, User, PaginationMeta } from '@/types';
import type { Role } from '@/lib/auth';

export const userKeys = {
  all: ['users'] as const,
  list: (p: UserListParams) => ['users', 'list', p] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
};

export interface UserListParams {
  role?: Role | '';
  isActive?: boolean;
  page?: number;
  limit?: number;
}

interface UserListResponse {
  data: User[];
  meta: PaginationMeta;
}

export function useUserList(params: UserListParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params.role) q.set('role', params.role);
      if (params.isActive !== undefined) q.set('isActive', String(params.isActive));
      if (params.page) q.set('page', String(params.page));
      if (params.limit) q.set('limit', String(params.limit));
      const { data } = await api.get<ApiResponse<User[]>>(`/users?${q}`);
      return { data: data.data, meta: data.meta } as UserListResponse;
    },
  });
}

export function useUpdateProfile(userId: string) {
  const qc = useQueryClient();
  const { updateUser } = useAuthStore();
  return useMutation({
    mutationFn: (payload: { name?: string; phone?: string }) =>
      api.put<ApiResponse<User>>(`/users/${userId}`, payload).then((r) => r.data.data),
    onSuccess: (data) => {
      updateUser(data);
      qc.invalidateQueries({ queryKey: userKeys.all });
      toast.success('Profil berhasil diperbarui');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal memperbarui profil';
      toast.error(msg);
    },
  });
}

export function useChangePassword(userId: string) {
  return useMutation({
    mutationFn: (payload: { oldPassword?: string; newPassword: string }) =>
      api.put(`/users/${userId}/password`, payload),
    onSuccess: () => toast.success('Password berhasil diubah'),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal mengubah password';
      toast.error(msg);
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      email: string;
      phone?: string;
      password: string;
      role: Role;
    }) => api.post<ApiResponse<User>>('/users', payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      toast.success('Pengguna berhasil ditambahkan');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menambahkan pengguna';
      toast.error(msg);
    },
  });
}

export function useChangeRole(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (role: Role) =>
      api.put<ApiResponse<User>>(`/users/${userId}/role`, { role }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      toast.success('Role berhasil diubah');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal mengubah role';
      toast.error(msg);
    },
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      api.put(`/users/${id}/${activate ? 'activate' : 'deactivate'}`),
    onSuccess: (_, { activate }) => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      toast.success(`Pengguna berhasil ${activate ? 'diaktifkan' : 'dinonaktifkan'}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal mengubah status pengguna';
      toast.error(msg);
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      toast.success('Pengguna berhasil dihapus');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menghapus pengguna';
      toast.error(msg);
    },
  });
}
