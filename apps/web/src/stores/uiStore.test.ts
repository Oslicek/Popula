import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      railCollapsed: false,
      mobileMenuOpen: false,
      chatPanelOpen: false,
      bottomTrayExpanded: false,
      devToolsModalOpen: false,
      isMobile: false,
    });
  });

  describe('rail state', () => {
    it('starts expanded (not collapsed)', () => {
      const state = useUIStore.getState();
      expect(state.railCollapsed).toBe(false);
    });

    it('toggles collapsed state', () => {
      const { toggleRail } = useUIStore.getState();
      
      toggleRail();
      expect(useUIStore.getState().railCollapsed).toBe(true);
      
      toggleRail();
      expect(useUIStore.getState().railCollapsed).toBe(false);
    });

    it('sets collapsed state explicitly', () => {
      const { setRailCollapsed } = useUIStore.getState();
      
      setRailCollapsed(true);
      expect(useUIStore.getState().railCollapsed).toBe(true);
      
      setRailCollapsed(false);
      expect(useUIStore.getState().railCollapsed).toBe(false);
    });
  });

  describe('mobile menu', () => {
    it('starts closed', () => {
      const state = useUIStore.getState();
      expect(state.mobileMenuOpen).toBe(false);
    });

    it('opens mobile menu', () => {
      const { openMobileMenu } = useUIStore.getState();
      
      openMobileMenu();
      expect(useUIStore.getState().mobileMenuOpen).toBe(true);
    });

    it('closes mobile menu', () => {
      useUIStore.setState({ mobileMenuOpen: true });
      const { closeMobileMenu } = useUIStore.getState();
      
      closeMobileMenu();
      expect(useUIStore.getState().mobileMenuOpen).toBe(false);
    });

    it('toggles mobile menu', () => {
      const { toggleMobileMenu } = useUIStore.getState();
      
      toggleMobileMenu();
      expect(useUIStore.getState().mobileMenuOpen).toBe(true);
      
      toggleMobileMenu();
      expect(useUIStore.getState().mobileMenuOpen).toBe(false);
    });
  });

  describe('chat panel', () => {
    it('starts closed', () => {
      const state = useUIStore.getState();
      expect(state.chatPanelOpen).toBe(false);
    });

    it('opens chat panel', () => {
      const { openChatPanel } = useUIStore.getState();
      
      openChatPanel();
      expect(useUIStore.getState().chatPanelOpen).toBe(true);
    });

    it('closes chat panel', () => {
      useUIStore.setState({ chatPanelOpen: true });
      const { closeChatPanel } = useUIStore.getState();
      
      closeChatPanel();
      expect(useUIStore.getState().chatPanelOpen).toBe(false);
    });

    it('toggles chat panel', () => {
      const { toggleChatPanel } = useUIStore.getState();
      
      toggleChatPanel();
      expect(useUIStore.getState().chatPanelOpen).toBe(true);
      
      toggleChatPanel();
      expect(useUIStore.getState().chatPanelOpen).toBe(false);
    });
  });

  describe('bottom tray', () => {
    it('starts collapsed', () => {
      const state = useUIStore.getState();
      expect(state.bottomTrayExpanded).toBe(false);
    });

    it('expands tray', () => {
      const { expandBottomTray } = useUIStore.getState();
      
      expandBottomTray();
      expect(useUIStore.getState().bottomTrayExpanded).toBe(true);
    });

    it('collapses tray', () => {
      useUIStore.setState({ bottomTrayExpanded: true });
      const { collapseBottomTray } = useUIStore.getState();
      
      collapseBottomTray();
      expect(useUIStore.getState().bottomTrayExpanded).toBe(false);
    });

    it('toggles tray', () => {
      const { toggleBottomTray } = useUIStore.getState();
      
      toggleBottomTray();
      expect(useUIStore.getState().bottomTrayExpanded).toBe(true);
      
      toggleBottomTray();
      expect(useUIStore.getState().bottomTrayExpanded).toBe(false);
    });
  });

  describe('devtools modal', () => {
    it('starts closed', () => {
      const state = useUIStore.getState();
      expect(state.devToolsModalOpen).toBe(false);
    });

    it('opens modal', () => {
      const { openDevToolsModal } = useUIStore.getState();
      
      openDevToolsModal();
      expect(useUIStore.getState().devToolsModalOpen).toBe(true);
    });

    it('closes modal', () => {
      useUIStore.setState({ devToolsModalOpen: true });
      const { closeDevToolsModal } = useUIStore.getState();
      
      closeDevToolsModal();
      expect(useUIStore.getState().devToolsModalOpen).toBe(false);
    });

    it('toggles modal', () => {
      const { toggleDevToolsModal } = useUIStore.getState();
      
      toggleDevToolsModal();
      expect(useUIStore.getState().devToolsModalOpen).toBe(true);
      
      toggleDevToolsModal();
      expect(useUIStore.getState().devToolsModalOpen).toBe(false);
    });
  });

  describe('mobile state', () => {
    it('tracks mobile breakpoint', () => {
      const { setIsMobile } = useUIStore.getState();
      
      setIsMobile(true);
      expect(useUIStore.getState().isMobile).toBe(true);
      
      setIsMobile(false);
      expect(useUIStore.getState().isMobile).toBe(false);
    });
  });
});
