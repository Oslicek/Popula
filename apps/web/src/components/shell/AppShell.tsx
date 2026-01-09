/**
 * AppShell - Main application layout component
 * 
 * Provides the overall structure:
 * - TopBar (header with logo, search, user area)
 * - LeftRail (navigation sidebar)
 * - Main content area (via Outlet)
 * - BottomTray (run queue, status)
 * - ChatPanel (dockable, optional)
 * - MobileNav (bottom navigation for mobile)
 */

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar/TopBar';
import { LeftRail } from './LeftRail/LeftRail';
import { BottomTray } from './BottomTray/BottomTray';
import { MobileNav } from './MobileNav/MobileNav';
import { useUIStore } from '../../stores/uiStore';
import styles from './AppShell.module.css';

const MOBILE_BREAKPOINT = 640;
const TABLET_BREAKPOINT = 1024;

export function AppShell() {
  const { 
    railCollapsed, 
    chatPanelOpen,
    isMobile,
    setIsMobile,
  } = useUIStore();

  // Handle responsive breakpoints
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D - Toggle DevTools
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        useUIStore.getState().toggleDevToolsModal();
      }
      // Ctrl+K - Toggle Global Search (placeholder for now)
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        // TODO: Open global search
        console.log('Global search triggered');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.shell}>
      {/* Top Bar */}
      <TopBar />

      {/* Main Layout */}
      <div className={styles.main}>
        {/* Left Rail - Hidden on mobile */}
        {!isMobile && (
          <LeftRail collapsed={railCollapsed} />
        )}

        {/* Content Area */}
        <main 
          className={styles.content}
          style={{
            marginLeft: isMobile ? 0 : (railCollapsed ? 'var(--rail-width-collapsed)' : 'var(--rail-width-expanded)'),
            marginRight: chatPanelOpen && !isMobile ? 'var(--chat-panel-width)' : 0,
          }}
        >
          <Outlet />
        </main>

        {/* Chat Panel - Docked on right (desktop) or fullscreen (mobile) */}
        {chatPanelOpen && (
          <aside className={`${styles.chatPanel} ${isMobile ? styles.chatPanelMobile : ''}`}>
            {/* ChatPanel component will go here */}
            <div className={styles.chatPanelPlaceholder}>
              <span>Chat Panel</span>
              <small>Coming in Phase 5</small>
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Tray - Desktop only */}
      {!isMobile && <BottomTray />}

      {/* Mobile Navigation - Mobile only */}
      {isMobile && <MobileNav />}
    </div>
  );
}
