/**
 * Data Workspace Page
 * 
 * Project data hub with:
 * - Dataset catalog
 * - Project files (uploaded/processed)
 * - GDAL tools
 * - File inspector
 */

import { useState } from 'react';
import { FileList, FileInspector, UploadDialog } from './components';
import { Button } from '../../components/ui';
import styles from './DataWorkspace.module.css';

type WorkspaceView = 'files' | 'catalog';

export function DataWorkspace() {
  const [activeView, setActiveView] = useState<WorkspaceView>('files');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <div className={styles.workspace}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Data Workspace</h1>
        </div>
        <div className={styles.headerRight}>
          <Button variant="secondary" size="sm" leftIcon={<span>🌐</span>} disabled>
            Fetch URL
          </Button>
          <Button size="sm" leftIcon={<span>📤</span>} onClick={() => setIsUploadOpen(true)}>
            Upload
          </Button>
        </div>
      </div>

      {/* Navigation tabs */}
      <nav className={styles.nav}>
        <button
          className={`${styles.navItem} ${activeView === 'files' ? styles.active : ''}`}
          onClick={() => setActiveView('files')}
        >
          📁 My Files
        </button>
        <button
          className={`${styles.navItem} ${activeView === 'catalog' ? styles.active : ''}`}
          onClick={() => setActiveView('catalog')}
        >
          📚 Catalog
        </button>
      </nav>

      {/* Main content */}
      <div className={styles.content}>
        {activeView === 'files' ? (
          <>
            <div className={styles.fileListPanel}>
              <FileList onUploadClick={() => setIsUploadOpen(true)} />
            </div>
            <FileInspector />
          </>
        ) : (
          <div className={styles.catalogView}>
            <div className={styles.catalogPlaceholder}>
              <div className={styles.catalogIcon}>📚</div>
              <h2 className={styles.catalogTitle}>Dataset Catalog</h2>
              <p className={styles.catalogDescription}>
                Browse and import datasets from public sources into your project
              </p>
              <div className={styles.catalogFeatures}>
                <div className={styles.catalogFeature}>
                  <span className={styles.catalogFeatureIcon}>🇬🇧</span>
                  <div className={styles.catalogFeatureText}>
                    <strong>ONS Data</strong>
                    <span>UK population projections, boundaries, census data</span>
                  </div>
                </div>
                <div className={styles.catalogFeature}>
                  <span className={styles.catalogFeatureIcon}>🇨🇿</span>
                  <div className={styles.catalogFeatureText}>
                    <strong>ČSÚ Data</strong>
                    <span>Czech statistical office, SLDB census, VFR boundaries</span>
                  </div>
                </div>
                <div className={styles.catalogFeature}>
                  <span className={styles.catalogFeatureIcon}>🌍</span>
                  <div className={styles.catalogFeatureText}>
                    <strong>UN Data</strong>
                    <span>World Population Prospects, demographic indicators</span>
                  </div>
                </div>
                <div className={styles.catalogFeature}>
                  <span className={styles.catalogFeatureIcon}>🗺️</span>
                  <div className={styles.catalogFeatureText}>
                    <strong>Natural Earth</strong>
                    <span>Free vector and raster map data</span>
                  </div>
                </div>
              </div>
              <div className={styles.comingSoon}>Coming Soon</div>
            </div>
          </div>
        )}
      </div>

      {/* Upload dialog */}
      <UploadDialog isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </div>
  );
}
