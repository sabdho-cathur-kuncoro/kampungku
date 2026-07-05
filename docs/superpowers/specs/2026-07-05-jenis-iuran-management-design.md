# Jenis Iuran Management Page — Design Spec

**Date:** 2026-07-05  
**Status:** Approved  
**Scope:** Frontend only — API and hooks already exist

---

## Overview

Add a management page at `/iuran/jenis` for ADMIN and BENDAHARA to create, edit, toggle active status, and delete jenis iuran (types of dues). Role lain dapat mengakses halaman dalam mode read-only.

---

## Files To Create / Modify

| File | Action |
|------|--------|
| `kampungku-web/src/app/(dashboard)/iuran/jenis/page.tsx` | Create — main page |
| `kampungku-web/src/app/(dashboard)/iuran/page.tsx` | Modify — add "Kelola Jenis" button |

---

## Page: `/iuran/jenis`

### Header
- `PageHeader` component
  - title: "Jenis Iuran"
  - description: "Kelola jenis dan tarif iuran RT"
  - action: tombol "+ Tambah Jenis" (visible only if `canManage`)
- Back button / link to `/iuran`

### Data
- `useJenisIuranList()` — no filter (fetch all: active + inactive)
- Inactive rows rendered with `opacity-50` or `text-stone-400` to visually distinguish

### Table (DataTable)
| Column | Content |
|--------|---------|
| Nama | Nama jenis iuran |
| Tarif | `formatRupiah(jumlah)` — monospace font |
| Keterangan | keterangan atau `—` jika null |
| Status | `StatusBadge` — "Aktif" (green) / "Nonaktif" (gray) |
| Aksi | "Edit" + "Hapus" buttons — visible only if `canManage` |

### Access Control
- `canManage`: role === `ADMIN` || role === `BENDAHARA`
- Non-canManage users: page visible, table visible, no action buttons

---

## JenisIuranFormDialog Component

Single dialog handling both create and edit modes.

**Props:**
```ts
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item?: JenisIuran; // undefined = create mode, defined = edit mode
}
```

**Fields:**
| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| nama | text | required, min 3, max 100 | |
| jumlah | number | required, positive | Label: "Tarif (Rp)" |
| keterangan | textarea | optional, max 500 | |
| isAktif | Select (Aktif/Nonaktif) | optional | Edit mode only — Switch tidak tersedia, pakai Select |

**Mutations:**
- Create mode: `useCreateJenisIuran()`
- Edit mode: `useUpdateJenisIuran(item.id)`

**On success:** close dialog, React Query invalidation handled by hook

---

## Delete Flow

- Tombol "Hapus" → set `deleteTarget` state → render `ConfirmDialog`
- `ConfirmDialog` props:
  - title: "Hapus Jenis Iuran"
  - description: `Hapus "${nama}"? Jenis iuran tidak bisa dihapus jika masih ada tagihan terkait.`
  - variant: destructive
- Mutation: `useDeleteJenisIuran()`
- Error dari API (409 conflict) sudah di-handle via toast di hook — tidak perlu extra handling

---

## Modification to `/iuran/page.tsx`

Add button next to existing "Laporan" button (visible to `canManage` only):

```tsx
<Button variant="outline" onClick={() => router.push('/iuran/jenis')}>
  <Settings size={14} className="mr-1.5" />
  Kelola Jenis
</Button>
```

---

## Form Validation (Zod — frontend)

```ts
const formSchema = z.object({
  nama: z.string().min(3, 'Minimal 3 karakter').max(100),
  jumlah: z.number({ invalid_type_error: 'Masukkan angka' }).positive('Harus lebih dari 0'),
  keterangan: z.string().max(500).optional(),
  isAktif: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});
```

---

## Existing Assets Used

- `useJenisIuranList`, `useCreateJenisIuran`, `useUpdateJenisIuran`, `useDeleteJenisIuran` — `hooks/useJenisIuran.ts`
- `DataTable`, `PageHeader`, `StatusBadge`, `ConfirmDialog` — `components/shared/`
- `Dialog`, `Button`, `Input`, `Label`, `Select`, `Textarea` — `components/ui/` (shadcn)
- `formatRupiah` — `lib/utils.ts`
- `JenisIuran` type — `types/index.ts`
- `useAuthStore` — `store/authStore.ts`

---

## Out of Scope

- Bulk create / import CSV
- Per-warga tarif override (handled in tagihan creation flow)
- Audit log / history perubahan tarif
