'use client';

import { MessageCircle, X, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChatInterface } from './ChatInterface';
import { useUiStore } from '@/store/uiStore';

export function ChatWidget() {
  const { chatWidgetOpen, toggleChatWidget } = useUiStore();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {chatWidgetOpen && (
        <div className="flex h-[500px] w-96 flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
          <ChatInterface
            compact
            headerSlot={
              <div className="flex items-center justify-between border-b bg-primary px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                    AI
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Asisten KampungKu</p>
                    <p className="text-xs text-white/70">Tanya seputar RT Anda</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:bg-white/20"
                    asChild
                  >
                    <Link href="/chatbot" onClick={toggleChatWidget}>
                      <Maximize2 className="h-4 w-4" />
                      <span className="sr-only">Buka halaman penuh</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:bg-white/20"
                    onClick={toggleChatWidget}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Tutup</span>
                  </Button>
                </div>
              </div>
            }
          />
        </div>
      )}

      {/* Floating button */}
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg"
        onClick={toggleChatWidget}
        aria-label="Buka asisten AI"
      >
        {chatWidgetOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}
