import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UIState {
  // Rail (left sidebar)
  railCollapsed: boolean;
  toggleRail: () => void;
  setRailCollapsed: (collapsed: boolean) => void;

  // Mobile menu (drawer)
  mobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;

  // Chat panel
  chatPanelOpen: boolean;
  openChatPanel: () => void;
  closeChatPanel: () => void;
  toggleChatPanel: () => void;

  // Bottom tray
  bottomTrayExpanded: boolean;
  expandBottomTray: () => void;
  collapseBottomTray: () => void;
  toggleBottomTray: () => void;

  // DevTools modal
  devToolsModalOpen: boolean;
  openDevToolsModal: () => void;
  closeDevToolsModal: () => void;
  toggleDevToolsModal: () => void;

  // Mobile state
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Rail state
      railCollapsed: false,
      toggleRail: () => set((state) => ({ railCollapsed: !state.railCollapsed })),
      setRailCollapsed: (collapsed) => set({ railCollapsed: collapsed }),

      // Mobile menu state
      mobileMenuOpen: false,
      openMobileMenu: () => set({ mobileMenuOpen: true }),
      closeMobileMenu: () => set({ mobileMenuOpen: false }),
      toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

      // Chat panel state
      chatPanelOpen: false,
      openChatPanel: () => set({ chatPanelOpen: true }),
      closeChatPanel: () => set({ chatPanelOpen: false }),
      toggleChatPanel: () => set((state) => ({ chatPanelOpen: !state.chatPanelOpen })),

      // Bottom tray state
      bottomTrayExpanded: false,
      expandBottomTray: () => set({ bottomTrayExpanded: true }),
      collapseBottomTray: () => set({ bottomTrayExpanded: false }),
      toggleBottomTray: () => set((state) => ({ bottomTrayExpanded: !state.bottomTrayExpanded })),

      // DevTools modal state
      devToolsModalOpen: false,
      openDevToolsModal: () => set({ devToolsModalOpen: true }),
      closeDevToolsModal: () => set({ devToolsModalOpen: false }),
      toggleDevToolsModal: () => set((state) => ({ devToolsModalOpen: !state.devToolsModalOpen })),

      // Mobile state
      isMobile: false,
      setIsMobile: (isMobile) => set({ isMobile }),
    }),
    {
      name: 'popula-ui-store',
      partialize: (state) => ({
        // Only persist certain UI preferences
        railCollapsed: state.railCollapsed,
      }),
    }
  )
);
