'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage } from './ChatMessage';
import { useChatHistory, useSendMessage } from '@/hooks/useChat';
import type { ChatQuota } from '@/types';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  compact?: boolean;
  headerSlot?: React.ReactNode;
}

export function ChatInterface({ compact = false, headerSlot }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data, isLoading: historyLoading } = useChatHistory();
  const sendMutation = useSendMessage();

  const messages = data?.messages ?? [];
  const quota: ChatQuota = data?.quota ?? { used: 0, limit: 5, remaining: 5 };
  const isQuotaExhausted = quota.remaining <= 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending || isQuotaExhausted) return;

    setInput('');
    await sendMutation.mutateAsync(trimmed);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn('flex flex-col', compact ? 'h-full' : 'h-full min-h-0')}>
      {headerSlot}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {historyLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!historyLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground">
            <div className="mb-2 text-3xl">💬</div>
            <p className="text-sm font-medium">Tanyakan sesuatu tentang RT Anda</p>
            <p className="text-xs mt-1">Status iuran, pengaduan, surat, pengumuman...</p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {sendMutation.isPending && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              AI
            </div>
            <div className="flex gap-1 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
              <span className="animate-bounce text-muted-foreground" style={{ animationDelay: '0ms' }}>●</span>
              <span className="animate-bounce text-muted-foreground" style={{ animationDelay: '150ms' }}>●</span>
              <span className="animate-bounce text-muted-foreground" style={{ animationDelay: '300ms' }}>●</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Footer: quota + input */}
      <div className="border-t p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {isQuotaExhausted
              ? '⚠️ Kuota harian habis. Coba lagi besok.'
              : `Sisa pesan hari ini: ${quota.remaining}/${quota.limit}`}
          </span>
        </div>
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isQuotaExhausted ? 'Kuota habis' : 'Tanya sesuatu...'}
            disabled={isQuotaExhausted || sendMutation.isPending}
            rows={compact ? 1 : 2}
            className="resize-none text-sm"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isQuotaExhausted || sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
