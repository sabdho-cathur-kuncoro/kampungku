'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ApiResponse, ChatMessage, ChatQuota, ChatSendResponse, ChatHistoryResponse } from '@/types';

export const chatKeys = {
  history: ['chatbot', 'history'] as const,
};

export function useChatHistory() {
  return useQuery({
    queryKey: chatKeys.history,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ChatHistoryResponse>>('/chatbot/history');
      return data.data;
    },
    staleTime: 0,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: string) => {
      const { data } = await api.post<ApiResponse<ChatSendResponse>>('/chatbot/send', { message });
      return data.data;
    },
    onMutate: async (message: string) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.history });

      const previous = queryClient.getQueryData<ChatHistoryResponse>(chatKeys.history);

      const optimisticUserMessage: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        sessionId: '',
        role: 'USER',
        content: message,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<ChatHistoryResponse>(chatKeys.history, (old) => ({
        messages: [...(old?.messages ?? []), optimisticUserMessage],
        quota: old?.quota ?? { used: 0, limit: 5, remaining: 5 },
      }));

      return { previous };
    },
    onSuccess: (result) => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sessionId: '',
        role: 'ASSISTANT',
        content: result.message,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<ChatHistoryResponse>(chatKeys.history, (old) => ({
        messages: [...(old?.messages ?? []), assistantMessage],
        quota: result.quota,
      }));
    },
    onError: (_error, _message, context) => {
      if (context?.previous) {
        queryClient.setQueryData(chatKeys.history, context.previous);
      }
      toast.error('Gagal mengirim pesan. Coba lagi.');
    },
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete('/chatbot/history');
    },
    onSuccess: () => {
      queryClient.setQueryData<ChatHistoryResponse>(chatKeys.history, { messages: [], quota: { used: 0, limit: 5, remaining: 5 } });
      toast.success('Riwayat percakapan dihapus');
    },
    onError: () => {
      toast.error('Gagal menghapus riwayat');
    },
  });
}
