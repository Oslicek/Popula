/**
 * TopBar - Application header
 * 
 * Contains:
 * - Logo and project switcher
 * - Global search (Ctrl+K)
 * - Notifications, Chat toggle, User menu
 */

import { Link } from 'react-router-dom';
import { useUIStore } from '../../../stores/uiStore';
import { useNatsStore } from '../../../stores/natsStore';
import styles from './TopBar.module.css';

export function TopBar() {
  const { toggleChatPanel, chatPanelOpen, toggleRail, railCollapsed, toggleMobileMenu, isMobile } = useUIStore();
  const { status } = useNatsStore();

  const handleMenuClick = () => {
    if (isMobile) {
      toggleMobileMenu();
    } else {
      toggleRail();
    }
  };

  return (
    <header className={styles.topBar}>
      {/* Left Section: Logo & Project */}
      <div className={styles.left}>
        <button 
          className={styles.menuButton}
          onClick={handleMenuClick}
          aria-label={isMobile ? 'Toggle menu' : (railCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
        >
          <MenuIcon />
        </button>
        
        <Link to="/explore" className={styles.logo}>
          <span className={styles.logoIcon}>◉</span>
          <span className={styles.logoText}>Popula</span>
        </Link>

        <div className={styles.projectSwitcher}>
          <button className={styles.projectButton}>
            <span className={styles.projectName}>Default Project</span>
            <ChevronDownIcon />
          </button>
        </div>
      </div>

      {/* Center Section: Search */}
      <div className={styles.center}>
        <button className={styles.searchButton}>
          <SearchIcon />
          <span className={styles.searchText}>Search...</span>
          <kbd className={styles.searchShortcut}>Ctrl K</kbd>
        </button>
      </div>

      {/* Right Section: Actions */}
      <div className={styles.right}>
        {/* Connection Status Indicator */}
        <div className={styles.statusIndicator} title={`NATS: ${status}`}>
          <span className={`${styles.statusDot} ${styles[status]}`} />
        </div>

        {/* Notifications */}
        <button className={styles.iconButton} aria-label="Notifications">
          <BellIcon />
        </button>

        {/* Chat Toggle */}
        <button 
          className={`${styles.iconButton} ${chatPanelOpen ? styles.active : ''}`}
          onClick={toggleChatPanel}
          aria-label={chatPanelOpen ? 'Close chat' : 'Open chat'}
        >
          <ChatIcon />
          {chatPanelOpen && <span className={styles.activeIndicator} />}
        </button>

        {/* User Menu */}
        <button className={styles.userButton}>
          <div className={styles.avatar}>
            <span>U</span>
          </div>
        </button>
      </div>
    </header>
  );
}

// ============================================================
// Icons (inline SVG for simplicity)
// ============================================================

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11l3 3" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2a6 6 0 016 6v4l2 2H2l2-2V8a6 6 0 016-6z" />
      <path d="M8 16a2 2 0 004 0" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H8l-4 3v-3H5a2 2 0 01-2-2V5z" />
      <path d="M7 8h6M7 11h4" strokeLinecap="round" />
    </svg>
  );
}
