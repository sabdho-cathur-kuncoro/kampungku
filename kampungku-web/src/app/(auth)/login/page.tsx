'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import type { ApiResponse, User } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    try {
      const { data } = await api.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>(
        '/auth/login',
        values,
      );
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      toast.success('Selamat datang, ' + data.data.user.name);
      router.push('/beranda');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login gagal. Periksa email dan password Anda.';
      toast.error(msg);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Logo + brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-600 mb-4">
          <span className="font-heading text-xl font-extrabold text-white">K</span>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-stone-900">KampungKu</h1>
        <p className="font-body text-sm text-stone-500 mt-1">Kampungmu di Ujung Jari</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
        <h2 className="font-heading text-lg font-bold text-stone-900 mb-5">Masuk ke Akun</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              type="email"
              placeholder="nama@kampungku.id"
              autoComplete="email"
              className="font-body"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-red-500 font-body">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="font-heading text-sm font-semibold text-stone-700">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                autoComplete="current-password"
                className="font-body pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 font-body">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 font-heading font-semibold h-10"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Masuk...
              </>
            ) : (
              'Masuk'
            )}
          </Button>
        </form>
      </div>

      <p className="text-center font-body text-xs text-stone-400 mt-6">
        © {new Date().getFullYear()} KampungKu. Hak cipta dilindungi.
      </p>
    </div>
  );
}
