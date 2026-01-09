/**
 * MobileNav - Bottom navigation for mobile devices
 * 
 * Shows 5 main navigation items at the bottom of the screen
 */

import { NavLink, useLocation } from 'react-router-dom';
import { isNavItemActive } from '../LeftRail/NavItem';
import styles from './MobileNav.module.css';

export function MobileNav() {
  const location = useLocation();

  const navItems = [
    { to: '/explore', icon: <ExploreIcon />, label: 'Explore' },
    { to: '/data', icon: <DataIcon />, label: 'Data' },
    { to: '/scenarios', icon: <ScenariosIcon />, label: 'Scenarios' },
    { to: '/runs', icon: <RunsIcon />, label: 'Runs' },
    { to: '/admin', icon: <AdminIcon />, label: 'More' },
  ];

  return (
    <nav className={styles.nav}>
      {navItems.map((item) => {
        const isActive = isNavItemActive(item.to, location.pathname);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

// ============================================================
// Icons (compact versions for mobile)
// ============================================================

function ExploreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DataIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.657 3.582 3 8 3s8-1.343 8-3V6" />
      <path d="M4 12c0 1.657 3.582 3 8 3s8-1.343 8-3" />
    </svg>
  );
}

function ScenariosIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M3 9h18M9 9v12" strokeLinecap="round" />
    </svg>
  );
}

function RunsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 4l12 8-12 8V4z" strokeLinejoin="round" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}
