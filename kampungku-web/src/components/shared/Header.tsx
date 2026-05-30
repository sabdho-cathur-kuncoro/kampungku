'use client';

import { Menu } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { toggleSidebar } = useUiStore();
  const { user } = useAuthStore();

  return (
    <header className="h-14 bg-white border-b border-stone-200 flex items-center px-4 gap-3 shrink-0">
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors md:hidden"
      >
        <Menu size={20} className="text-stone-600" />
      </button>

      {title && (
        <h2 className="font-heading text-sm font-semibold text-stone-700">{title}</h2>
      )}

      <div className="ml-auto flex items-center gap-3">
        {user && (
          <div className="text-right hidden sm:block">
            <p className="font-heading text-sm font-semibold text-stone-800 leading-none">
              {user.name}
            </p>
            <p className="font-body text-xs text-stone-500 mt-0.5">{user.email}</p>
          </div>
        )}
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
          <span className="font-heading text-xs font-bold text-white">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </span>
        </div>
      </div>
    </header>
  );
}
