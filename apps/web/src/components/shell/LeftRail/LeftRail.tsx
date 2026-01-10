/**
 * LeftRail - Navigation sidebar
 * 
 * Contains main navigation items:
 * - Explore (main workbench)
 * - Data Workspace
 * - Scenarios
 * - Runs
 * - Reports
 * - Admin (conditional)
 */

import { NavItem } from './NavItem';
import { useUIStore } from '../../../stores/uiStore';
import styles from './LeftRail.module.css';

interface LeftRailProps {
  collapsed: boolean;
}

export function LeftRail({ collapsed }: LeftRailProps) {
  const { toggleRail, mobileMenuOpen, closeMobileMenu } = useUIStore();

  return (
    <>
      {/* Backdrop for mobile drawer */}
      <div 
        className={`${styles.backdrop} ${mobileMenuOpen ? styles.visible : ''}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />
      
      <nav className={`${styles.rail} ${collapsed ? styles.collapsed : ''} ${mobileMenuOpen ? styles.mobileOpen : ''}`}>
        {/* Mobile close button */}
        <button 
          className={styles.mobileCloseButton}
          onClick={closeMobileMenu}
          aria-label="Close menu"
        >
          <CloseIcon />
        </button>
        
        <div className={styles.navItems}>
        {/* Main Navigation */}
        <NavItem
          to="/explore"
          icon={<ExploreIcon />}
          label="Explore"
          collapsed={collapsed}
        />
        <NavItem
          to="/data"
          icon={<DataIcon />}
          label="Data"
          collapsed={collapsed}
        />
        <NavItem
          to="/scenarios"
          icon={<ScenariosIcon />}
          label="Scenarios"
          collapsed={collapsed}
        />
        <NavItem
          to="/runs"
          icon={<RunsIcon />}
          label="Runs"
          collapsed={collapsed}
        />
        <NavItem
          to="/reports"
          icon={<ReportsIcon />}
          label="Reports"
          collapsed={collapsed}
        />

        {/* Divider */}
        <div className={styles.divider} />

        {/* Admin Section */}
        <NavItem
          to="/admin"
          icon={<AdminIcon />}
          label="Admin"
          collapsed={collapsed}
        />
      </div>

      {/* Collapse Toggle (bottom) */}
      <button 
        className={styles.collapseButton}
        onClick={toggleRail}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <CollapseIcon collapsed={collapsed} />
      </button>
    </nav>
    </>
  );
}

// ============================================================
// Icons
// ============================================================

function ExploreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="8" />
      <path d="M10 6v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10h1M13 10h1M10 6v1M10 13v1" strokeLinecap="round" />
    </svg>
  );
}

function DataIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="10" cy="5" rx="7" ry="3" />
      <path d="M3 5v10c0 1.657 3.134 3 7 3s7-1.343 7-3V5" />
      <path d="M3 10c0 1.657 3.134 3 7 3s7-1.343 7-3" />
    </svg>
  );
}

function ScenariosIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3h14v14H3z" strokeLinejoin="round" />
      <path d="M3 7h14M7 7v10" strokeLinecap="round" />
      <path d="M10 10h4M10 13h4" strokeLinecap="round" />
    </svg>
  );
}

function RunsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 3l10 7-10 7V3z" strokeLinejoin="round" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" strokeLinejoin="round" />
      <path d="M12 2v4h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 10h6M7 13h4" strokeLinecap="round" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="3" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2" strokeLinecap="round" />
      <path d="M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 16 16" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5"
      style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
    >
      <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
    </svg>
  );
}
