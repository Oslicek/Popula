/**
 * FileInspector Component
 * 
 * Shows details and preview for selected file
 */

import { useDataStore, selectSelectedFile, type FileType } from '../../../../stores/dataStore';
import { Button, Tabs } from '../../../../components/ui';
import { useState } from 'react';
import styles from './FileInspector.module.css';

const FILE_TYPE_ICONS: Record<FileType, string> = {
  population: '👥',
  mortality: '💀',
  fertility: '👶',
  migration: '✈️',
  geojson: '🗺️',
  unknown: '📄',
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function FileInspector() {
  const selectedFile = useDataStore(selectSelectedFile);
  const { removeFile, selectFile } = useDataStore();
  const [activeTab, setActiveTab] = useState('details');

  if (!selectedFile) {
    return (
      <div className={styles.inspector}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h3 className={styles.emptyTitle}>No file selected</h3>
          <p className={styles.emptyDescription}>
            Select a file from the list to view its details and preview
          </p>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this file?')) {
      removeFile(selectedFile.id);
      selectFile(null);
    }
  };

  return (
    <div className={styles.inspector}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.headerIcon}>{FILE_TYPE_ICONS[selectedFile.type]}</span>
          {selectedFile.name}
        </div>
        <div className={styles.headerSubtitle}>
          {selectedFile.type.charAt(0).toUpperCase() + selectedFile.type.slice(1)} data
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'details', label: 'Details' },
          { id: 'preview', label: 'Preview' },
          { id: 'schema', label: 'Schema' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        fullWidth
      />

      <div className={styles.content}>
        {selectedFile.error && (
          <div className={styles.errorBanner}>
            ⚠️ {selectedFile.error}
          </div>
        )}

        {activeTab === 'details' && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>File Information</h4>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Size</span>
                <span className={styles.metaValue}>{formatFileSize(selectedFile.size)}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Type</span>
                <span className={styles.metaValue}>{selectedFile.type}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Status</span>
                <span className={styles.metaValue}>{selectedFile.status}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Rows</span>
                <span className={styles.metaValue}>
                  {selectedFile.rowCount !== undefined ? selectedFile.rowCount.toLocaleString() : '—'}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Uploaded</span>
                <span className={styles.metaValue}>{formatDate(selectedFile.uploadedAt)}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Columns</span>
                <span className={styles.metaValue}>{selectedFile.columns?.length ?? '—'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Data Preview</h4>
            {selectedFile.preview && selectedFile.columns ? (
              <div className={styles.previewContainer}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      {selectedFile.columns.map((col, i) => (
                        <th key={i}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFile.preview.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                No preview available
              </p>
            )}
          </div>
        )}

        {activeTab === 'schema' && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Columns</h4>
            {selectedFile.columns ? (
              <div className={styles.columns}>
                {selectedFile.columns.map((col, i) => (
                  <span key={i} className={styles.column}>{col}</span>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                No schema available
              </p>
            )}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" fullWidth disabled>
          🔧 Process with GDAL
        </Button>
        <Button variant="secondary" fullWidth disabled>
          📤 Publish to Project
        </Button>
        <Button variant="ghost" fullWidth onClick={handleDelete}>
          🗑️ Delete File
        </Button>
      </div>
    </div>
  );
}
