/**
 * Runs Page - Run history and comparison
 */

import styles from './Runs.module.css';

export function RunsPlaceholder() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Runs</h1>
        <div className={styles.filters}>
          <select className={styles.filter}>
            <option>All Types</option>
            <option>Analysis</option>
            <option>Data Jobs</option>
          </select>
          <select className={styles.filter}>
            <option>All Status</option>
            <option>Queued</option>
            <option>Running</option>
            <option>Done</option>
            <option>Failed</option>
          </select>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <div className={styles.icon}>▶️</div>
          <h2>Run History</h2>
          <p>View and manage projection runs and data jobs</p>
          <p className={styles.note}>Coming in Phase 4</p>
        </div>
      </div>
    </div>
  );
}

export function RunDetailPlaceholder() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Run Details</h1>
      </div>
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <div className={styles.icon}>📊</div>
          <h2>Run #1234</h2>
          <p>View run configuration, results, and artifacts</p>
          <p className={styles.note}>Coming in Phase 4</p>
        </div>
      </div>
    </div>
  );
}

export function CompareViewPlaceholder() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Compare Runs</h1>
      </div>
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <div className={styles.icon}>⚖️</div>
          <h2>Run Comparison</h2>
          <p>Compare 2-4 runs side by side</p>
          <p className={styles.note}>Coming in Phase 4</p>
        </div>
      </div>
    </div>
  );
}

export { RunsPlaceholder as Runs };
