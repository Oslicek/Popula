/**
 * FileList Component
 * 
 * Displays a list of data files with filtering and actions
 */

import { useState, useMemo } from 'react';
import { useDataStore, type FileType, type DataFile } from '../../../../stores/dataStore';
import { Button } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/ui';
import styles from './FileList.module.css';

interface FileListProps {
  onUploadClick: () => void;
}

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
  });
};

export function FileList({ onUploadClick }: FileListProps) {
  const { files, selectedFileId, selectFile, removeFile } = useDataStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FileType | 'all'>('all');

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || file.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [files, searchQuery, typeFilter]);

  const handleRowClick = (file: DataFile) => {
    selectFile(file.id === selectedFileId ? null : file.id);
  };

  const handleDelete = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this file?')) {
      removeFile(fileId);
    }
  };

  if (files.length === 0) {
    return (
      <div className={styles.fileList}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📁</div>
          <h3 className={styles.emptyTitle}>No files yet</h3>
          <p className={styles.emptyDescription}>
            Upload CSV files to get started with your demographic analysis
          </p>
          <Button onClick={onUploadClick} leftIcon={<span>📤</span>}>
            Upload Files
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.fileList}>
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className={styles.filterGroup}>
          <select
            className={styles.filterSelect}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as FileType | 'all')}
          >
            <option value="all">All Types</option>
            <option value="population">Population</option>
            <option value="mortality">Mortality</option>
            <option value="fertility">Fertility</option>
            <option value="migration">Migration</option>
            <option value="geojson">GeoJSON</option>
            <option value="unknown">Other</option>
          </select>
        </div>
        <Button onClick={onUploadClick} size="sm" leftIcon={<span>📤</span>}>
          Upload
        </Button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Size</th>
              <th>Rows</th>
              <th>Status</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.map((file) => (
              <tr
                key={file.id}
                className={`${styles.tableRow} ${file.id === selectedFileId ? styles.selected : ''}`}
                onClick={() => handleRowClick(file)}
              >
                <td>
                  <div className={styles.fileName}>
                    <span className={styles.fileIcon}>{FILE_TYPE_ICONS[file.type]}</span>
                    {file.name}
                  </div>
                </td>
                <td>
                  <span className={`${styles.fileType} ${styles[file.type]}`}>
                    {file.type}
                  </span>
                </td>
                <td>
                  <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                </td>
                <td>
                  {file.rowCount !== undefined ? file.rowCount.toLocaleString() : '—'}
                </td>
                <td>
                  <StatusBadge
                    status={file.status === 'ready' ? 'done' : file.status === 'processing' ? 'running' : 'failed'}
                    label={file.status}
                    size="sm"
                  />
                </td>
                <td>
                  <span className={styles.fileDate}>{formatDate(file.uploadedAt)}</span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      title="View details"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectFile(file.id);
                      }}
                    >
                      👁️
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.danger}`}
                      title="Delete"
                      onClick={(e) => handleDelete(e, file.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
