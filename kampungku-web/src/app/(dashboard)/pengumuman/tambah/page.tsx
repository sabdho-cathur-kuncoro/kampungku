'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePengumuman } from '@/hooks/usePengumuman';
import type { KategoriPengumuman } from '@/types';

const schema = z.object({
  judul: z.string().min(3, 'Judul minimal 3 karakter').max(200),
  konten: z.string().min(10, 'Konten minimal 10 karakter'),
  kategori: z.enum(['UMUM', 'KEGIATAN', 'KEUANGAN', 'DARURAT']).optional(),
  tglMulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
  tglSelesai: z.string().optional().or(z.literal('')),
  isPinned: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 font-body mt-1">{msg}</p>;
}

const today = new Date().toISOString().split('T')[0];

export default function TambahPengumumanPage() {
  const router = useRouter();
  const createMutation = useCreatePengumuman();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kategori: 'UMUM',
      tglMulai: today,
      isPinned: false,
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(
      {
        judul: values.judul,
        konten: values.konten,
        kategori: values.kategori,
        tglMulai: values.tglMulai,
        tglSelesai: values.tglSelesai || undefined,
        isPinned: values.isPinned,
      },
      { onSuccess: (data) => router.push(`/pengumuman/${data.id}`) },
    );
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Buat Pengumuman"
        description="Publikasikan informasi atau kegiatan RT"
        action={
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="h-9 font-heading font-semibold text-sm"
          >
            <ArrowLeft size={14} className="mr-1.5" />
            Kembali
          </Button>
        }
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl border border-stone-200 p-6 space-y-5"
      >
        {/* Judul */}
        <div className="space-y-1.5">
          <Label className="font-heading text-sm font-semibold text-stone-700">
            Judul <span className="text-red-500">*</span>
          </Label>
          <Input
            {...register('judul')}
            placeholder="Judul pengumuman"
            className="font-body"
          />
          <FieldError msg={errors.judul?.message} />
        </div>

        {/* Konten */}
        <div className="space-y-1.5">
          <Label className="font-heading text-sm font-semibold text-stone-700">
            Konten <span className="text-red-500">*</span>
          </Label>
          <Textarea
            {...register('konten')}
            placeholder="Isi pengumuman secara lengkap..."
            rows={6}
            className="font-body resize-none"
          />
          <FieldError msg={errors.konten?.message} />
        </div>

        {/* Kategori + Pin */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">Kategori</Label>
            <Select
              value={watch('kategori') ?? 'UMUM'}
              onValueChange={(v) => setValue('kategori', v as KategoriPengumuman)}
            >
              <SelectTrigger className="font-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UMUM">Umum</SelectItem>
                <SelectItem value="KEGIATAN">Kegiatan</SelectItem>
                <SelectItem value="KEUANGAN">Keuangan</SelectItem>
                <SelectItem value="DARURAT">Darurat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">Sematkan (Pin)</Label>
            <Select
              value={watch('isPinned') ? 'true' : 'false'}
              onValueChange={(v) => setValue('isPinned', v === 'true')}
            >
              <SelectTrigger className="font-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Tidak</SelectItem>
                <SelectItem value="true">Ya — tampilkan di atas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tanggal */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Tanggal Mulai <span className="text-red-500">*</span>
            </Label>
            <Input {...register('tglMulai')} type="date" className="font-body" />
            <FieldError msg={errors.tglMulai?.message} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Tanggal Selesai
            </Label>
            <Input {...register('tglSelesai')} type="date" className="font-body" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="font-heading font-semibold"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-green-600 hover:bg-green-700 font-heading font-semibold"
          >
            {createMutation.isPending && (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            )}
            Publikasikan
          </Button>
        </div>
      </form>
    </div>
  );
}
