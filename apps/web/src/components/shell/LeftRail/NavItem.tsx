/**
 * NavItem - Single navigation item in the left rail
 */

import { NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useUIStore } from '../../../stores/uiStore';
import styles from './NavItem.module.css';

interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  badge?: number;
}

/**
 * Check if a nav item should be marked as active
 * Exported for testing
 */
export function isNavItemActive(navPath: string, currentPath: string): boolean {
  // Normalize paths - remove trailing slashes
  const normalizedNavPath = navPath.replace(/\/$/, '') || '/';
  const normalizedCurrentPath = currentPath.replace(/\/$/, '') || '/';

  // Exact match
  if (normalizedNavPath === normalizedCurrentPath) {
    return true;
  }

  // Root path only matches exactly
  if (normalizedNavPath === '/') {
    return false;
  }

  // Check if current path starts with nav path followed by /
  // This ensures /data matches /data/catalog but not /database
  return normalizedCurrentPath.startsWith(normalizedNavPath + '/');
}

export function NavItem({ to, icon, label, collapsed, badge }: NavItemProps) {
  const location = useLocation();
  const { closeMobileMenu, isMobile } = useUIStore();
  const isActive = isNavItemActive(to, location.pathname);

  const handleClick = () => {
    // Close mobile menu when navigating
    if (isMobile) {
      closeMobileMenu();
    }
  };

  return (
    <NavLink
      to={to}
      className={`${styles.navItem} ${isActive ? styles.active : ''} ${collapsed ? styles.collapsed : ''}`}
      title={collapsed ? label : undefined}
      onClick={handleClick}
    >
      <span className={styles.icon}>{icon}</span>
      {!collapsed && (
        <>
          <span className={styles.label}>{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className={styles.badge}>{badge > 99 ? '99+' : badge}</span>
          )}
        </>
      )}
      {collapsed && badge !== undefined && badge > 0 && (
        <span className={styles.badgeCollapsed} />
      )}
    </NavLink>
  );
}
