/**
 * Reports Page - Export and sharing hub
 */

import styles from './Reports.module.css';

export function ReportsPlaceholder() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Reports</h1>
        <button className="btn btn-primary">+ New Report</button>
      </div>
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <div className={styles.icon}>📄</div>
          <h2>Reports & Exports</h2>
          <p>Generate and share analysis reports</p>
          <div className={styles.features}>
            <div className={styles.feature}>
              <strong>Export Data</strong>
              <span>CSV, Parquet, GeoJSON</span>
            </div>
            <div className={styles.feature}>
              <strong>Generate Reports</strong>
              <span>PDF summaries with charts</span>
            </div>
            <div className={styles.feature}>
              <strong>Share Links</strong>
              <span>Public or team sharing</span>
            </div>
          </div>
          <p className={styles.note}>Coming in Phase 4</p>
        </div>
      </div>
    </div>
  );
}

export { ReportsPlaceholder as Reports };
