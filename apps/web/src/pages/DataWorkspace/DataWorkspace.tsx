/**
 * Data Workspace Page
 * 
 * Project data hub with:
 * - Dataset catalog
 * - Project files (uploaded/processed)
 * - GDAL tools
 * - Job console
 */

import styles from './DataWorkspace.module.css';

interface DataWorkspaceProps {
  view?: 'catalog' | 'files';
}

export function DataWorkspacePlaceholder({ view = 'files' }: DataWorkspaceProps) {
  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <h1>Data Workspace</h1>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${view === 'catalog' ? styles.active : ''}`}>
            Catalog
          </button>
          <button className={`${styles.tab} ${view === 'files' ? styles.active : ''}`}>
            My Files
          </button>
        </div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <div className={styles.icon}>📁</div>
          <h2>{view === 'catalog' ? 'Dataset Catalog' : 'Project Files'}</h2>
          <p>
            {view === 'catalog' 
              ? 'Browse and import datasets from public sources'
              : 'Manage your uploaded and processed files'}
          </p>
          <div className={styles.features}>
            <div className={styles.feature}>
              <strong>File Browser</strong>
              <span>Navigate and organize your data files</span>
            </div>
            <div className={styles.feature}>
              <strong>GDAL Tools</strong>
              <span>Convert, reproject, simplify, clip geometries</span>
            </div>
            <div className={styles.feature}>
              <strong>Publish Flow</strong>
              <span>Make processed files available for analysis</span>
            </div>
          </div>
          <p className={styles.note}>Coming in Phase 6</p>
        </div>
      </div>
    </div>
  );
}

export { DataWorkspacePlaceholder as DataWorkspace };
