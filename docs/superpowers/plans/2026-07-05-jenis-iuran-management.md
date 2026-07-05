# Jenis Iuran Management Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/iuran/jenis` page for ADMIN/BENDAHARA to CRUD jenis iuran, plus a "Kelola Jenis" button on the existing `/iuran` page.

**Architecture:** Two-file change — one new page (`iuran/jenis/page.tsx`) that contains the full list + create/edit dialog + delete confirm, and one modification to the existing `iuran/page.tsx` to add a nav button. All API hooks already exist in `hooks/useJenisIuran.ts`.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, React Hook Form + Zod, TanStack Query v5, shadcn/ui, Tailwind CSS, Lucide icons

## Global Constraints

- All UI text in Bahasa Indonesia
- `canManage` = `role === 'ADMIN' || role === 'BENDAHARA'`; other roles see read-only view
- No new shadcn components — only use what exists: `dialog`, `button`, `input`, `label`, `select`, `textarea`, `badge`, `separator`, `skeleton`, `tabs`
- `StatusBadge` does not support `isAktif` boolean — render aktif/nonaktif badge inline
- Follow existing font classes: `font-heading font-semibold` for labels/headings, `font-body` for body text, `font-mono` for numbers
- All responses use standard API format `{ success, message, data }`
- `useJenisIuranList()` (no arg) fetches all including nonaktif — use this on management page
- `useJenisIuranList(true)` fetches aktif only — use this on tagihan creation form (already done)

---

## File Map

| Action | Path |
|--------|------|
| **Create** | `kampungku-web/src/app/(dashboard)/iuran/jenis/page.tsx` |
| **Modify** | `kampungku-web/src/app/(dashboard)/iuran/page.tsx` |

---

### Task 1: Create `/iuran/jenis/page.tsx`

**Files:**
- Create: `kampungku-web/src/app/(dashboard)/iuran/jenis/page.tsx`

**Interfaces:**
- Consumes:
  - `useJenisIuranList()` from `@/hooks/useJenisIuran` → `JenisIuran[]`
  - `useCreateJenisIuran()` → `mutate({ nama, jumlah, keterangan? })`
  - `useUpdateJenisIuran(id: string)` → `mutate({ nama?, jumlah?, keterangan?, isAktif? })`
  - `useDeleteJenisIuran()` → `mutate(id: string)`
  - `useAuthStore` from `@/store/authStore` → `user.role`
  - `DataTable<JenisIuran>` with `Column<JenisIuran>[]` from `@/components/shared/DataTable`
  - `PageHeader` from `@/components/shared/PageHeader`
  - `ConfirmDialog` from `@/components/shared/ConfirmDialog`
  - `formatRupiah` from `@/lib/utils`
  - `JenisIuran` type from `@/types`
- Produces: Next.js page component at route `/iuran/jenis`

- [ ] **Step 1: Create the file with all imports and Zod schema**

Create `kampungku-web/src/app/(dashboard)/iuran/jenis/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Plus, ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import {
  useJenisIuranList,
  useCreateJenisIuran,
  useUpdateJenisIuran,
  useDeleteJenisIuran,
} from '@/hooks/useJenisIuran';
import { formatRupiah } from '@/lib/utils';
import type { JenisIuran } from '@/types';

const formSchema = z.object({
  nama: z.string().min(3, 'Minimal 3 karakter').max(100),
  jumlah: z
    .number({ invalid_type_error: 'Masukkan angka' })
    .positive('Harus lebih dari 0'),
  keterangan: z.string().max(500).optional(),
  isAktif: z.enum(['true', 'false']).optional(),
});

type FormValues = z.infer<typeof formSchema>;
```

- [ ] **Step 2: Add `JenisIuranFormDialog` component**

Append after the schema (still in the same file, before the default export):

```tsx
function JenisIuranFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item?: JenisIuran;
}) {
  const isEdit = !!item;
  const createMutation = useCreateJenisIuran();
  const updateMutation = useUpdateJenisIuran(item?.id ?? '');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: item
      ? {
          nama: item.nama,
          jumlah: item.jumlah,
          keterangan: item.keterangan ?? '',
          isAktif: item.isAktif ? 'true' : 'false',
        }
      : { isAktif: 'true' },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FormValues) => {
    if (isEdit) {
      updateMutation.mutate(
        {
          nama: values.nama,
          jumlah: values.jumlah,
          keterangan: values.keterangan || undefined,
          isAktif: values.isAktif === 'true',
        },
        {
          onSuccess: () => {
            reset();
            onOpenChange(false);
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          nama: values.nama,
          jumlah: values.jumlah,
          keterangan: values.keterangan || undefined,
        },
        {
          onSuccess: () => {
            reset();
            onOpenChange(false);
          },
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold">
            {isEdit ? 'Edit Jenis Iuran' : 'Tambah Jenis Iuran'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Nama <span className="text-red-500">*</span>
            </Label>
            <Input
              {...register('nama')}
              placeholder="Mis. Iuran Sampah"
              className="font-body"
            />
            {errors.nama && (
              <p className="text-xs text-red-500">{errors.nama.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Tarif (Rp) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              placeholder="Mis. 5000"
              className="font-mono"
              defaultValue={item?.jumlah}
              onChange={(e) =>
                setValue('jumlah', e.target.value ? Number(e.target.value) : ('' as unknown as number))
              }
            />
            {errors.jumlah && (
              <p className="text-xs text-red-500">{errors.jumlah.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Keterangan
            </Label>
            <Textarea
              {...register('keterangan')}
              placeholder="Opsional"
              className="font-body resize-none"
              rows={3}
            />
            {errors.keterangan && (
              <p className="text-xs text-red-500">{errors.keterangan.message}</p>
            )}
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <Label className="font-heading text-sm font-semibold text-stone-700">
                Status
              </Label>
              <Select
                value={watch('isAktif') ?? 'true'}
                onValueChange={(v) => setValue('isAktif', v as 'true' | 'false')}
              >
                <SelectTrigger className="font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true" className="font-body">Aktif</SelectItem>
                  <SelectItem value="false" className="font-body">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="font-heading font-semibold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 font-heading font-semibold"
            >
              {isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              {isEdit ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Add the default export page component**

Append after `JenisIuranFormDialog` (at the end of the file):

```tsx
export default function JenisIuranPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canManage = user?.role === 'ADMIN' || user?.role === 'BENDAHARA';

  const { data: jenisIuranList, isLoading } = useJenisIuranList();
  const deleteMutation = useDeleteJenisIuran();

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<JenisIuran | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<JenisIuran | null>(null);

  const openCreate = () => {
    setEditItem(undefined);
    setFormOpen(true);
  };

  const openEdit = (item: JenisIuran) => {
    setEditItem(item);
    setFormOpen(true);
  };

  const columns: Column<JenisIuran>[] = [
    {
      key: 'nama',
      header: 'Nama',
      render: (r) => (
        <span className={`font-semibold ${r.isAktif ? 'text-stone-900' : 'text-stone-400'}`}>
          {r.nama}
        </span>
      ),
    },
    {
      key: 'jumlah',
      header: 'Tarif',
      render: (r) => (
        <span className={`font-mono text-sm font-semibold ${r.isAktif ? '' : 'text-stone-400'}`}>
          {formatRupiah(r.jumlah)}
        </span>
      ),
    },
    {
      key: 'keterangan',
      header: 'Keterangan',
      render: (r) => (
        <span className={`font-body text-sm ${r.isAktif ? 'text-stone-600' : 'text-stone-400'}`}>
          {r.keterangan ?? '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-heading ${
            r.isAktif
              ? 'bg-green-100 text-green-700'
              : 'bg-stone-100 text-stone-500'
          }`}
        >
          {r.isAktif ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'aksi',
            header: 'Aksi',
            width: 'w-24',
            render: (r: JenisIuran) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(r)}
                  className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(r)}
                  className="text-xs text-red-500 font-semibold hover:underline flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  Hapus
                </button>
              </div>
            ),
          } satisfies Column<JenisIuran>,
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Jenis Iuran"
        description="Kelola jenis dan tarif iuran RT"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="h-9 font-heading font-semibold text-sm text-stone-600"
            >
              <ArrowLeft size={14} className="mr-1.5" />
              Kembali
            </Button>
            {canManage && (
              <Button
                onClick={openCreate}
                className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
              >
                <Plus size={14} className="mr-1.5" />
                Tambah Jenis
              </Button>
            )}
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={jenisIuranList ?? []}
        isLoading={isLoading}
        emptyTitle="Belum ada jenis iuran"
        emptyDescription="Tambah jenis iuran untuk mulai membuat tagihan"
      />

      <JenisIuranFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditItem(undefined);
        }}
        item={editItem}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Jenis Iuran"
        description={`Hapus "${deleteTarget?.nama}"? Jenis iuran tidak bisa dihapus jika masih ada tagihan terkait.`}
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={() =>
          deleteMutation.mutate(deleteTarget!.id, {
            onSettled: () => setDeleteTarget(null),
          })
        }
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
cd kampungku-web && npx tsc --noEmit 2>&1 | grep -E "iuran/jenis|error"
```

Expected: no errors for `iuran/jenis/page.tsx`

- [ ] **Step 5: Commit**

```bash
git add kampungku-web/src/app/\(dashboard\)/iuran/jenis/page.tsx
git commit -m "feat(web): add jenis iuran management page at /iuran/jenis"
```

---

### Task 2: Add "Kelola Jenis" button to `/iuran/page.tsx`

**Files:**
- Modify: `kampungku-web/src/app/(dashboard)/iuran/page.tsx`

**Interfaces:**
- Consumes: existing `router` (already imported via `useRouter`), existing `canManage` logic, existing `Button` import
- Produces: "Kelola Jenis" button in page header action area, visible to `canManage` roles only

- [ ] **Step 1: Add `Settings` to existing lucide-react import**

In `kampungku-web/src/app/(dashboard)/iuran/page.tsx`, find:

```tsx
import { Plus, BarChart2, Loader2 } from 'lucide-react';
```

Replace with:

```tsx
import { Plus, BarChart2, Loader2, Settings } from 'lucide-react';
```

- [ ] **Step 2: Add "Kelola Jenis" button in the page header action**

Find the existing action block in the `IuranPage` return:

```tsx
action={
  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      onClick={() => router.push('/iuran/laporan')}
      className="h-9 font-heading font-semibold text-sm"
    >
      <BarChart2 size={14} className="mr-1.5" />
      Laporan
    </Button>
    {canManage && (
      <Button
        onClick={() => setCreateOpen(true)}
        className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
      >
        <Plus size={14} className="mr-1.5" />
        Buat Tagihan
      </Button>
    )}
  </div>
}
```

Replace with:

```tsx
action={
  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      onClick={() => router.push('/iuran/laporan')}
      className="h-9 font-heading font-semibold text-sm"
    >
      <BarChart2 size={14} className="mr-1.5" />
      Laporan
    </Button>
    {canManage && (
      <Button
        variant="outline"
        onClick={() => router.push('/iuran/jenis')}
        className="h-9 font-heading font-semibold text-sm"
      >
        <Settings size={14} className="mr-1.5" />
        Kelola Jenis
      </Button>
    )}
    {canManage && (
      <Button
        onClick={() => setCreateOpen(true)}
        className="h-9 bg-green-600 hover:bg-green-700 font-heading font-semibold text-sm"
      >
        <Plus size={14} className="mr-1.5" />
        Buat Tagihan
      </Button>
    )}
  </div>
}
```

- [ ] **Step 3: Type-check**

```bash
cd kampungku-web && npx tsc --noEmit 2>&1 | grep -E "iuran/page|error"
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add kampungku-web/src/app/\(dashboard\)/iuran/page.tsx
git commit -m "feat(web): add Kelola Jenis button on iuran page"
```

---

## Self-Review Checklist

- [x] `/iuran/jenis` page — covered Task 1
- [x] `JenisIuranFormDialog` create + edit mode — Task 1 Step 2
- [x] Delete with ConfirmDialog — Task 1 Step 3
- [x] `canManage` access control on action buttons — Task 1 Step 3
- [x] Inactive rows visually dimmed — Task 1 Step 3 (opacity via `text-stone-400`)
- [x] Inline aktif/nonaktif badge (not StatusBadge) — Task 1 Step 3
- [x] "Kelola Jenis" button on `/iuran` page — Task 2
- [x] No new shadcn components needed
- [x] `useJenisIuranList()` (all) on management page vs `useJenisIuranList(true)` on tagihan form
