'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, Plus, Loader2, Eye, EyeOff, UserCircle2, Wallet, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/lib/auth';
import {
  useUpdateProfile,
  useChangePassword,
  useCreateUser,
  useChangeRole,
  useToggleUserActive,
  useDeleteUser,
  useUserList,
} from '@/hooks/useUser';
import {
  useJenisIuranList,
  useCreateJenisIuran,
  useUpdateJenisIuran,
  useDeleteJenisIuran,
} from '@/hooks/useJenisIuran';
import { formatRupiah } from '@/lib/utils';
import type { User, JenisIuran } from '@/types';
import type { Role } from '@/lib/auth';

// ─── Constants ────────────────────────────────────────────────────────────────

const TENANT_ROLES: Role[] = ['ADMIN', 'KETUA_RT', 'BENDAHARA', 'SEKRETARIS', 'WARGA'];

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'text-red-600 bg-red-50',
  KETUA_RT: 'text-purple-600 bg-purple-50',
  BENDAHARA: 'text-blue-600 bg-blue-50',
  SEKRETARIS: 'text-amber-600 bg-amber-50',
  WARGA: 'text-stone-600 bg-stone-100',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-heading font-semibold ${ROLE_COLOR[role] ?? 'bg-stone-100 text-stone-600'}`}>
      {ROLE_LABELS[role as Role] ?? role}
    </span>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 font-body mt-1">{msg}</p>;
}

// ─── Tab: Profil ──────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  phone: z.string().max(15).optional().or(z.literal('')),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Password lama wajib diisi'),
    newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi password tidak cocok',
  });
type PasswordForm = z.infer<typeof passwordSchema>;

function TabProfil() {
  const { user } = useAuthStore();
  const updateProfile = useUpdateProfile(user?.id ?? '');
  const changePassword = useChangePassword(user?.id ?? '');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '' },
  });

  useEffect(() => {
    if (user) profileForm.reset({ name: user.name, phone: user.phone ?? '' });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSaveProfile = (values: ProfileForm) => {
    updateProfile.mutate({ name: values.name, phone: values.phone || undefined });
  };

  const onChangePassword = (values: PasswordForm) => {
    changePassword.mutate(
      { oldPassword: values.oldPassword, newPassword: values.newPassword },
      { onSuccess: () => passwordForm.reset() },
    );
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* Profile info */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center shrink-0">
            <span className="font-heading text-xl font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-heading font-bold text-stone-900">{user?.name}</p>
            <p className="font-body text-xs text-stone-500">{user?.email}</p>
          </div>
          <div className="ml-auto">
            <RoleBadge role={user?.role ?? ''} />
          </div>
        </div>

        <Separator className="mb-5" />

        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">Nama Lengkap</Label>
            <Input {...profileForm.register('name')} className="font-body" />
            <FieldError msg={profileForm.formState.errors.name?.message} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">No. Telepon</Label>
            <Input {...profileForm.register('phone')} placeholder="08xxxxxxxxxx" className="font-body" />
            <FieldError msg={profileForm.formState.errors.phone?.message} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">Email</Label>
            <Input value={user?.email ?? ''} disabled className="font-body bg-stone-50 text-stone-400" />
            <p className="text-xs text-stone-400">Email tidak dapat diubah</p>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateProfile.isPending}
              className="bg-green-600 hover:bg-green-700 font-heading font-semibold"
            >
              {updateProfile.isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              Simpan Profil
            </Button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h3 className="font-heading font-bold text-stone-800 mb-4">Ubah Password</h3>
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">Password Lama</Label>
            <div className="relative">
              <Input
                {...passwordForm.register('oldPassword')}
                type={showOld ? 'text' : 'password'}
                className="font-body pr-10"
              />
              <button type="button" onClick={() => setShowOld((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <FieldError msg={passwordForm.formState.errors.oldPassword?.message} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">Password Baru</Label>
            <div className="relative">
              <Input
                {...passwordForm.register('newPassword')}
                type={showNew ? 'text' : 'password'}
                className="font-body pr-10"
              />
              <button type="button" onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <FieldError msg={passwordForm.formState.errors.newPassword?.message} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">Konfirmasi Password Baru</Label>
            <Input
              {...passwordForm.register('confirmPassword')}
              type="password"
              className="font-body"
            />
            <FieldError msg={passwordForm.formState.errors.confirmPassword?.message} />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={changePassword.isPending}
              variant="outline"
              className="font-heading font-semibold"
            >
              {changePassword.isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              Ubah Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab: Jenis Iuran ─────────────────────────────────────────────────────────

const jenisSchema = z.object({
  nama: z.string().min(3, 'Nama minimal 3 karakter').max(100),
  jumlah: z.number().positive('Jumlah harus lebih dari 0'),
  keterangan: z.string().max(500).optional().or(z.literal('')),
});
type JenisForm = z.infer<typeof jenisSchema>;

function JenisDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: JenisIuran | null;
}) {
  const createMutation = useCreateJenisIuran();
  const updateMutation = useUpdateJenisIuran(editing?.id ?? '');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<JenisForm>({
    resolver: zodResolver(jenisSchema),
  });

  useEffect(() => {
    if (open) {
      reset(
        editing
          ? { nama: editing.nama, jumlah: editing.jumlah, keterangan: editing.keterangan ?? '' }
          : { nama: '', jumlah: 0, keterangan: '' },
      );
    }
  }, [open, editing, reset]);

  const onSubmit = (values: JenisForm) => {
    const payload = { nama: values.nama, jumlah: values.jumlah, keterangan: values.keterangan || undefined };
    if (editing) {
      updateMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    } else {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold">
            {editing ? 'Edit Jenis Iuran' : 'Tambah Jenis Iuran'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Nama <span className="text-red-500">*</span>
            </Label>
            <Input {...register('nama')} placeholder="Iuran Keamanan" className="font-body" />
            <FieldError msg={errors.nama?.message} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Jumlah (Rp) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min={0}
              placeholder="15000"
              className="font-body"
              defaultValue={editing?.jumlah ?? ''}
              onChange={(e) => setValue('jumlah', e.target.value ? Number(e.target.value) : 0)}
            />
            <FieldError msg={errors.jumlah?.message} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">Keterangan</Label>
            <Input {...register('keterangan')} placeholder="Opsional" className="font-body" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-heading font-semibold">
              Batal
            </Button>
            <Button type="submit" disabled={isPending} className="bg-green-600 hover:bg-green-700 font-heading font-semibold">
              {isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              {editing ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Per-row toggle button — must be a component to call hooks at top level
function JenisAktifToggle({ jenis }: { jenis: JenisIuran }) {
  const mutation = useUpdateJenisIuran(jenis.id);
  return (
    <button
      onClick={() => mutation.mutate({ isAktif: !jenis.isAktif })}
      disabled={mutation.isPending}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-heading font-semibold disabled:opacity-60 ${
        jenis.isAktif ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
      }`}
    >
      {jenis.isAktif ? 'Aktif' : 'Nonaktif'}
    </button>
  );
}

function TabJenisIuran() {
  const { data, isLoading } = useJenisIuranList();
  const deleteMutation = useDeleteJenisIuran();

  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<JenisIuran | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns: Column<JenisIuran>[] = [
    {
      key: 'nama',
      header: 'Nama',
      render: (r) => <span className="font-semibold text-stone-900">{r.nama}</span>,
    },
    {
      key: 'jumlah',
      header: 'Jumlah',
      render: (r) => <span className="font-mono text-sm">{formatRupiah(r.jumlah)}</span>,
    },
    {
      key: 'keterangan',
      header: 'Keterangan',
      render: (r) => <span className="text-stone-500">{r.keterangan ?? '—'}</span>,
    },
    {
      key: 'aktif',
      header: 'Status',
      render: (r) => <JenisAktifToggle jenis={r} />,
    },
    {
      key: 'aksi',
      header: '',
      width: 'w-20',
      render: (r) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditing(r); setDialog(true); }}
            className="text-stone-400 hover:text-stone-700 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteId(r.id)}
            className="text-stone-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => { setEditing(null); setDialog(true); }}
          className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
        >
          <Plus size={14} className="mr-1.5" />
          Tambah Jenis Iuran
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        emptyTitle="Belum ada jenis iuran"
        emptyDescription="Tambahkan jenis iuran untuk RT ini"
      />

      <JenisDialog
        open={dialog}
        onOpenChange={(v) => { setDialog(v); if (!v) setEditing(null); }}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Hapus Jenis Iuran"
        description="Jenis iuran ini akan dihapus. Jika masih ada tagihan terkait, penghapusan akan gagal — nonaktifkan saja."
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId, { onSettled: () => setDeleteId(null) });
        }}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}

// ─── Tab: Pengguna ────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().max(15).optional().or(z.literal('')),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  role: z.enum(['ADMIN', 'KETUA_RT', 'BENDAHARA', 'SEKRETARIS', 'WARGA']),
});
type CreateUserForm = z.infer<typeof createUserSchema>;

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createMutation = useCreateUser();
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'WARGA' },
  });

  const onSubmit = (values: CreateUserForm) => {
    createMutation.mutate(
      { ...values, phone: values.phone || undefined, role: values.role as Role },
      { onSuccess: () => { reset(); onOpenChange(false); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold">Tambah Pengguna</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
          {[
            { field: 'name' as const, label: 'Nama Lengkap', placeholder: 'Budi Santoso', required: true },
            { field: 'email' as const, label: 'Email', placeholder: 'budi@email.com', required: true, type: 'email' },
            { field: 'phone' as const, label: 'Telepon', placeholder: '08xx', required: false },
            { field: 'password' as const, label: 'Password', placeholder: 'Min. 8 karakter', required: true, type: 'password' },
          ].map(({ field, label, placeholder, required, type }) => (
            <div key={field} className="space-y-1">
              <Label className="font-heading text-sm font-semibold text-stone-700">
                {label} {required && <span className="text-red-500">*</span>}
              </Label>
              <Input {...register(field)} type={type ?? 'text'} placeholder={placeholder} className="font-body" />
              <FieldError msg={errors[field]?.message} />
            </div>
          ))}
          <div className="space-y-1">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Role <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch('role')}
              onValueChange={(v) => setValue('role', v as CreateUserForm['role'])}
            >
              <SelectTrigger className="font-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TENANT_ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="font-body">{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-heading font-semibold">Batal</Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-green-600 hover:bg-green-700 font-heading font-semibold">
              {createMutation.isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              Tambah
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangeRoleDialog({
  user: target,
  open,
  onOpenChange,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const changeRole = useChangeRole(target?.id ?? '');
  const [role, setRole] = useState<Role>((target?.role as Role) ?? 'WARGA');

  useEffect(() => {
    if (target) setRole(target.role as Role);
  }, [target]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold">Ubah Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <p className="font-body text-sm text-stone-600">{target?.name}</p>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="font-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TENANT_ROLES.map((r) => (
                <SelectItem key={r} value={r} className="font-body">{ROLE_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 font-heading font-semibold">Batal</Button>
            <Button
              disabled={changeRole.isPending}
              onClick={() => changeRole.mutate(role, { onSuccess: () => onOpenChange(false) })}
              className="flex-1 bg-green-600 hover:bg-green-700 font-heading font-semibold"
            >
              {changeRole.isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabPengguna() {
  const { user: currentUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useUserList({ page, limit: 20 });
  const toggleActive = useToggleUserActive();
  const deleteMutation = useDeleteUser();

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Nama',
      render: (r) => (
        <div>
          <p className="font-semibold text-stone-900">{r.name}</p>
          <p className="font-body text-xs text-stone-500">{r.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (r) => <RoleBadge role={r.role} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-heading font-semibold ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
          {r.isActive ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
    {
      key: 'aksi',
      header: 'Aksi',
      width: 'w-40',
      render: (r) => {
        const isSelf = r.id === currentUser?.id;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRoleTarget(r)}
              disabled={isSelf}
              className="text-xs text-stone-500 hover:text-stone-800 font-semibold disabled:opacity-30"
            >
              Role
            </button>
            <button
              onClick={() => toggleActive.mutate({ id: r.id, activate: !r.isActive })}
              disabled={isSelf || toggleActive.isPending}
              className={`text-xs font-semibold disabled:opacity-30 ${r.isActive ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'}`}
            >
              {r.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
            <button
              onClick={() => setDeleteId(r.id)}
              disabled={isSelf}
              className="text-xs text-red-400 hover:text-red-600 font-semibold disabled:opacity-30"
            >
              Hapus
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
        >
          <Plus size={14} className="mr-1.5" />
          Tambah Pengguna
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={setPage}
        emptyTitle="Belum ada pengguna"
      />

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ChangeRoleDialog
        user={roleTarget}
        open={!!roleTarget}
        onOpenChange={(v) => !v && setRoleTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Hapus Pengguna"
        description="Akun pengguna ini akan dihapus permanen."
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId, { onSettled: () => setDeleteId(null) });
        }}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PengaturanPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const canManageIuran = isAdmin || user?.role === 'BENDAHARA';

  return (
    <div>
      <PageHeader title="Pengaturan" description="Profil, iuran, dan manajemen pengguna" />

      <Tabs defaultValue="profil">
        <TabsList className="mb-6">
          <TabsTrigger value="profil" className="font-heading font-semibold text-sm gap-1.5">
            <UserCircle2 size={14} />
            Profil
          </TabsTrigger>
          {canManageIuran && (
            <TabsTrigger value="jenis-iuran" className="font-heading font-semibold text-sm gap-1.5">
              <Wallet size={14} />
              Jenis Iuran
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="pengguna" className="font-heading font-semibold text-sm gap-1.5">
              <Users size={14} />
              Pengguna
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profil">
          <TabProfil />
        </TabsContent>

        {canManageIuran && (
          <TabsContent value="jenis-iuran">
            <TabJenisIuran />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="pengguna">
            <TabPengguna />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
