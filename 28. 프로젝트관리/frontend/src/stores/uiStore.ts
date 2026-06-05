import { create } from 'zustand';

type ViewMode = 'board' | 'list' | 'gantt' | 'calendar' | 'dashboard';

interface UiState {
  viewMode: ViewMode;
  selectedCardId: string | null;
  isTransferDialogOpen: boolean;
  isSidebarOpen: boolean;
  setViewMode: (mode: ViewMode) => void;
  setSelectedCard: (id: string | null) => void;
  openTransferDialog: () => void;
  closeTransferDialog: () => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  viewMode: 'board',
  selectedCardId: null,
  isTransferDialogOpen: false,
  isSidebarOpen: true,
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedCard: (id) => set({ selectedCardId: id }),
  openTransferDialog: () => set({ isTransferDialogOpen: true }),
  closeTransferDialog: () => set({ isTransferDialogOpen: false }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
