'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users,
  Wallet,
  Bell,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { ROLE_LABELS } from '@/lib/auth';
import type { Role } from '@/types';

const NAV_ITEMS = [
  { href: '/beranda', icon: Home, label: 'Beranda' },
  { href: '/warga', icon: Users, label: 'Data Warga' },
  { href: '/iuran', icon: Wallet, label: 'Iuran' },
  { href: '/pengumuman', icon: Bell, label: 'Pengumuman' },
  { href: '/surat', icon: FileText, label: 'Surat' },
  { href: '/pengaduan', icon: MessageSquare, label: 'Pengaduan' },
  { href: '/pengaturan', icon: Settings, label: 'Pengaturan' },
] as const;

const ROLE_BADGE_CLASS: Record<Role, string> = {
  SUPER_ADMIN: 'bg-purple-900/40 text-purple-300',
  ADMIN: 'bg-green-900/40 text-green-300',
  KETUA_RT: 'bg-green-900/40 text-green-300',
  BENDAHARA: 'bg-amber-900/40 text-amber-300',
  SEKRETARIS: 'bg-blue-900/40 text-blue-300',
  WARGA: 'bg-stone-800/40 text-stone-300',
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUiStore();

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen shrink-0 transition-all duration-200',
        sidebarOpen ? 'w-56' : 'w-14',
      )}
      style={{ backgroundColor: '#0f3d20' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-4 overflow-hidden">
        <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
          <span className="text-white font-heading font-bold text-xs">K</span>
        </div>
        {sidebarOpen && (
          <span className="font-heading text-base font-extrabold text-white truncate">
            KampungKu
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-heading font-medium transition-colors',
                active
                  ? 'bg-green-600 text-white'
                  : 'text-green-200 hover:bg-green-800/40 hover:text-white',
                !sidebarOpen && 'justify-center px-2',
              )}
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      {user && sidebarOpen && (
        <div className="px-3 py-3 border-t border-green-900/50">
          <p className="font-heading text-xs font-semibold text-white truncate">{user.name}</p>
          <span
            className={cn(
              'inline-block mt-0.5 text-xs font-heading px-1.5 py-0.5 rounded',
              ROLE_BADGE_CLASS[user.role],
            )}
          >
            {ROLE_LABELS[user.role]}
          </span>
        </div>
      )}

      {/* Logout */}
      <div className={cn('px-2 pb-3', !sidebarOpen && 'flex justify-center')}>
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-heading font-medium text-green-200 hover:bg-red-900/40 hover:text-red-300 transition-colors w-full',
            !sidebarOpen && 'w-auto justify-center px-2',
          )}
          title={!sidebarOpen ? 'Keluar' : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {sidebarOpen && <span>Keluar</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-white border border-stone-200 flex items-center justify-center shadow-sm hover:bg-stone-50 transition-colors z-10"
      >
        {sidebarOpen ? (
          <ChevronLeft size={12} className="text-stone-600" />
        ) : (
          <ChevronRight size={12} className="text-stone-600" />
        )}
      </button>
    </aside>
  );
}
