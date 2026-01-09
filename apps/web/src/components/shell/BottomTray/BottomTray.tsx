/**
 * BottomTray - Run queue and status bar
 * 
 * Shows:
 * - Run queue status (queued, running, done counts)
 * - Quick access to open full queue
 * - Compare button for run comparison
 */

import { useUIStore } from '../../../stores/uiStore';
import styles from './BottomTray.module.css';

export function BottomTray() {
  const { bottomTrayExpanded, toggleBottomTray } = useUIStore();

  // Placeholder data - will be replaced with real run queue state
  const queueStats = {
    queued: 0,
    running: 0,
    done: 0,
  };

  return (
    <div className={`${styles.tray} ${bottomTrayExpanded ? styles.expanded : ''}`}>
      {/* Main bar (always visible) */}
      <div className={styles.bar}>
        <button 
          className={styles.expandButton}
          onClick={toggleBottomTray}
          aria-label={bottomTrayExpanded ? 'Collapse tray' : 'Expand tray'}
        >
          <ChevronIcon expanded={bottomTrayExpanded} />
        </button>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={`${styles.statDot} ${styles.queued}`} />
            <span className={styles.statLabel}>Queued</span>
            <span className={styles.statValue}>{queueStats.queued}</span>
          </div>
          <div className={styles.statItem}>
            <span className={`${styles.statDot} ${styles.running}`} />
            <span className={styles.statLabel}>Running</span>
            <span className={styles.statValue}>{queueStats.running}</span>
          </div>
          <div className={styles.statItem}>
            <span className={`${styles.statDot} ${styles.done}`} />
            <span className={styles.statLabel}>Done</span>
            <span className={styles.statValue}>{queueStats.done}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.actionButton}>
            <QueueIcon />
            <span>Open Queue</span>
          </button>
          <button className={styles.actionButton}>
            <CompareIcon />
            <span>Compare</span>
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {bottomTrayExpanded && (
        <div className={styles.expandedContent}>
          <div className={styles.placeholder}>
            <span>Run Queue Details</span>
            <small>Coming in Phase 4</small>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Icons
// ============================================================

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 16 16" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5"
      style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
    >
      <path d="M4 10l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12M2 8h12M2 12h8" strokeLinecap="round" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2v12M2 8h12" strokeLinecap="round" />
      <rect x="3" y="3" width="4" height="4" rx="0.5" />
      <rect x="9" y="9" width="4" height="4" rx="0.5" />
    </svg>
  );
}
