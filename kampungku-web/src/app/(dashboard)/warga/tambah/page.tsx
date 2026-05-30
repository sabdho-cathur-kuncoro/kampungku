'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateWarga } from '@/hooks/useWarga';

const nikRegex = /^\d{16}$/;
const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)/;

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().max(15).optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(passwordRegex, 'Password harus mengandung huruf dan angka'),
  nik: z.string().regex(nikRegex, 'NIK harus 16 digit angka'),
  noKk: z.string().regex(nikRegex, 'No. KK harus 16 digit angka'),
  alamat: z.string().min(5, 'Alamat minimal 5 karakter').max(500),
  statusTinggal: z.enum(['TETAP', 'KONTRAK', 'KOST', 'PINDAH']).optional(),
  tglMasuk: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 font-body mt-1">{msg}</p>;
}

function FormField({ label, required, children, error }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-heading text-sm font-semibold text-stone-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      <FieldError msg={error} />
    </div>
  );
}

export default function TambahWargaPage() {
  const router = useRouter();
  const createMutation = useCreateWarga();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { statusTinggal: 'TETAP' },
  });

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      phone: values.phone || undefined,
      tglMasuk: values.tglMasuk || undefined,
    };
    createMutation.mutate(payload as Parameters<typeof createMutation.mutate>[0], {
      onSuccess: (data) => router.push(`/warga/${data.id}`),
    });
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Tambah Warga"
        description="Daftarkan warga baru ke sistem RT"
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

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-stone-200 p-6 space-y-6">
        {/* Section: Akun */}
        <div>
          <h3 className="font-heading text-sm font-semibold text-stone-500 uppercase tracking-wide mb-4">
            Informasi Akun
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nama Lengkap" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="Budi Santoso" className="font-body" />
            </FormField>
            <FormField label="Email" required error={errors.email?.message}>
              <Input {...register('email')} type="email" placeholder="budi@email.com" className="font-body" />
            </FormField>
            <FormField label="No. Telepon" error={errors.phone?.message}>
              <Input {...register('phone')} placeholder="08123456789" className="font-body" />
            </FormField>
            <FormField label="Password" required error={errors.password?.message}>
              <Input {...register('password')} type="password" placeholder="Min. 8 karakter" className="font-body" />
            </FormField>
          </div>
        </div>

        <div className="border-t border-stone-100" />

        {/* Section: Data Kependudukan */}
        <div>
          <h3 className="font-heading text-sm font-semibold text-stone-500 uppercase tracking-wide mb-4">
            Data Kependudukan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="NIK" required error={errors.nik?.message}>
              <Input
                {...register('nik')}
                placeholder="16 digit angka"
                maxLength={16}
                className="font-mono"
              />
            </FormField>
            <FormField label="No. Kartu Keluarga" required error={errors.noKk?.message}>
              <Input
                {...register('noKk')}
                placeholder="16 digit angka"
                maxLength={16}
                className="font-mono"
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Alamat" required error={errors.alamat?.message}>
                <Textarea
                  {...register('alamat')}
                  placeholder="Jl. Contoh No. 1 RT 01/RW 01"
                  rows={3}
                  className="font-body resize-none"
                />
              </FormField>
            </div>
            <FormField label="Status Tinggal" error={errors.statusTinggal?.message}>
              <Select
                value={watch('statusTinggal') ?? 'TETAP'}
                onValueChange={(v) => setValue('statusTinggal', v as FormValues['statusTinggal'])}
              >
                <SelectTrigger className="font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TETAP">Tetap</SelectItem>
                  <SelectItem value="KONTRAK">Kontrak</SelectItem>
                  <SelectItem value="KOST">Kost</SelectItem>
                  <SelectItem value="PINDAH">Pindah</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Tanggal Masuk" error={errors.tglMasuk?.message}>
              <Input {...register('tglMasuk')} type="date" className="font-body" />
            </FormField>
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
            disabled={isSubmitting || createMutation.isPending}
            className="bg-green-600 hover:bg-green-700 font-heading font-semibold"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={14} className="mr-1.5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Warga'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
