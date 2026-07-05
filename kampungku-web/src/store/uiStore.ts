import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  chatWidgetOpen: boolean;
  toggleChatWidget: () => void;
  setChatWidgetOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  chatWidgetOpen: false,
  toggleChatWidget: () => set((s) => ({ chatWidgetOpen: !s.chatWidgetOpen })),
  setChatWidgetOpen: (open) => set({ chatWidgetOpen: open }),
}));
