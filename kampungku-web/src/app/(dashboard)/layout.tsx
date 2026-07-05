'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/shared/Sidebar';
import { Header } from '@/components/shared/Header';
import { ChatWidget } from '@/components/shared/ChatWidget';
import { Providers } from '@/components/providers';
import { useAuthStore } from '@/store/authStore';

const CHATBOT_ROLES = ['ADMIN', 'KETUA_RT', 'BENDAHARA', 'SEKRETARIS', 'SUPER_ADMIN'] as const;

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, accessToken, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user || !accessToken) {
      router.replace('/login');
    }
  }, [_hasHydrated, user, accessToken, router]);

  if (!_hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="w-8 h-8 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user || !accessToken) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
      {user && CHATBOT_ROLES.includes(user.role as typeof CHATBOT_ROLES[number]) && (
        <ChatWidget />
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <DashboardShell>{children}</DashboardShell>
    </Providers>
  );
}
