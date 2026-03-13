import { create } from "zustand";
import type { Citation } from "@/types/chat";

interface AppState {
  activeSessionId: string | null;
  sidebarOpen: boolean;
  sourcePanelOpen: boolean;
  activeCitation: Citation | null;
  setActiveSessionId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setSourcePanelOpen: (open: boolean) => void;
  setActiveCitation: (citation: Citation | null) => void;
  resetChat: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeSessionId: null,
  sidebarOpen: true,
  sourcePanelOpen: false,
  activeCitation: null,
  setActiveSessionId: (id) =>
    set({
      activeSessionId: id,
      sourcePanelOpen: false,
      activeCitation: null,
    }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSourcePanelOpen: (open) => set({ sourcePanelOpen: open }),
  setActiveCitation: (citation) =>
    set({ activeCitation: citation, sourcePanelOpen: Boolean(citation) }),
  resetChat: () =>
    set({
      activeSessionId: null,
      sidebarOpen: true,
      sourcePanelOpen: false,
      activeCitation: null,
    }),
}));
