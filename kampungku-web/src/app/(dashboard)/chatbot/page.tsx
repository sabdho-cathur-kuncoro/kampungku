'use client';

import { Bot, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/shared/ChatInterface';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useClearHistory, useChatHistory } from '@/hooks/useChat';
import { useState } from 'react';

export default function ChatbotPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data } = useChatHistory();
  const clearMutation = useClearHistory();

  const hasMessages = (data?.messages?.length ?? 0) > 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Asisten AI KampungKu</h1>
            <p className="text-sm text-muted-foreground">Tanyakan seputar RT Anda</p>
          </div>
        </div>
        {hasMessages && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={clearMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Bersihkan Riwayat
          </Button>
        )}
      </div>

      {/* Chat interface */}
      <div className="flex-1 min-h-0">
        <ChatInterface />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus Riwayat Percakapan"
        description="Semua riwayat chat akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={async () => {
          await clearMutation.mutateAsync();
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}
