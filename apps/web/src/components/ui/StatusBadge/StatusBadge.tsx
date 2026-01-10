/**
 * StatusBadge Component
 * 
 * Displays status indicators for runs, jobs, etc.
 */

import type { ReactNode } from 'react';
import styles from './StatusBadge.module.css';

export type StatusType = 'queued' | 'running' | 'done' | 'failed' | 'pending' | 'cancelled';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface StatusBadgeProps {
  status: StatusType;
  size?: BadgeSize;
  showDot?: boolean;
  icon?: ReactNode;
  label?: string;
  className?: string;
}

const DEFAULT_LABELS: Record<StatusType, string> = {
  queued: 'Queued',
  running: 'Running',
  done: 'Done',
  failed: 'Failed',
  pending: 'Pending',
  cancelled: 'Cancelled',
};

export function StatusBadge({
  status,
  size = 'md',
  showDot = true,
  icon,
  label,
  className,
}: StatusBadgeProps) {
  const displayLabel = label ?? DEFAULT_LABELS[status];
  
  const classNames = [
    styles.badge,
    styles[status],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {showDot && !icon && <span className={styles.dot} />}
      {displayLabel}
    </span>
  );
}
