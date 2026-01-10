/**
 * Reports Page - Export and sharing hub
 * 
 * Features:
 * - Reports table with filtering
 * - Multiple export formats (PDF, CSV, Parquet, GeoJSON, PMTiles)
 * - Report generation workflow
 * - Sharing with public links
 */

import { useEffect } from 'react';
import { useReportsStore, type Report, type ReportType, type ReportStatus } from '../../stores/reportsStore';
import styles from './Reports.module.css';

export function Reports() {
  const {
    reports,
    selectedReportId,
    selectReport,
    clearSelection,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    getFilteredReports,
    getSelectedReport,
    addReport,
    deleteReport,
    createShareLink,
    revokeShareLink,
  } = useReportsStore();

  const filteredReports = getFilteredReports();
  const selectedReport = getSelectedReport();

  // Add demo reports on first load if empty
  useEffect(() => {
    if (reports.length === 0) {
      addReport({
        name: 'Q4 2025 Population Summary',
        description: 'Quarterly population analysis with regional breakdown',
        type: 'pdf',
        status: 'ready',
        owner: 'system',
        runId: 'run-001',
        fileSize: 2450000,
        downloadUrl: '/reports/q4-2025-summary.pdf',
      });
      addReport({
        name: 'LAD Population Projections',
        description: 'Local Authority District level projections 2025-2050',
        type: 'csv',
        status: 'ready',
        owner: 'user',
        runId: 'run-002',
        fileSize: 890000,
        downloadUrl: '/reports/lad-projections.csv',
      });
      addReport({
        name: 'Regional Boundaries',
        description: 'GeoJSON boundaries for visualization',
        type: 'geojson',
        status: 'ready',
        owner: 'user',
        fileSize: 15600000,
        downloadUrl: '/reports/boundaries.geojson',
      });
      addReport({
        name: 'High-res Map Tiles',
        description: 'PMTiles for interactive mapping',
        type: 'pmtiles',
        status: 'generating',
        owner: 'user',
      });
    }
  }, [reports.length, addReport]);

  const handleRowClick = (id: string) => {
    if (selectedReportId === id) {
      clearSelection();
    } else {
      selectReport(id);
    }
  };

  const typeFilters: Array<{ label: string; value: ReportType | null }> = [
    { label: 'All', value: null },
    { label: 'PDF', value: 'pdf' },
    { label: 'CSV', value: 'csv' },
    { label: 'GeoJSON', value: 'geojson' },
    { label: 'Parquet', value: 'parquet' },
  ];

  const statusFilters: Array<{ label: string; value: ReportStatus | null }> = [
    { label: 'All', value: null },
    { label: 'Ready', value: 'ready' },
    { label: 'Generating', value: 'generating' },
    { label: 'Failed', value: 'failed' },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Reports & Exports</h1>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-secondary">
            Export Data
          </button>
          <button className="btn btn-primary">
            + New Report
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <SearchIcon className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Type:</span>
            {typeFilters.map((filter) => (
              <button
                key={filter.label}
                className={`${styles.filterButton} ${typeFilter === filter.value ? styles.active : ''}`}
                onClick={() => setTypeFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Status:</span>
            {statusFilters.map((filter) => (
              <button
                key={filter.label}
                className={`${styles.filterButton} ${statusFilter === filter.value ? styles.active : ''}`}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Reports List */}
        <div className={styles.listSection}>
          {filteredReports.length === 0 ? (
            <EmptyState hasReports={reports.length > 0} />
          ) : (
            <div className={styles.reportsTable}>
              <div className={styles.tableHeader}>
                <span>Name</span>
                <span>Type</span>
                <span>Status</span>
                <span>Size</span>
                <span>Date</span>
              </div>
              {filteredReports.map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  isSelected={selectedReportId === report.id}
                  onClick={() => handleRowClick(report.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Inspector Panel */}
        <div className={styles.inspectorSection}>
          {selectedReport ? (
            <ReportInspector 
              report={selectedReport}
              onDelete={() => deleteReport(selectedReport.id)}
              onShare={() => createShareLink(selectedReport.id)}
              onRevokeShare={() => revokeShareLink(selectedReport.id)}
            />
          ) : (
            <NoSelection />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

interface ReportRowProps {
  report: Report;
  isSelected: boolean;
  onClick: () => void;
}

function ReportRow({ report, isSelected, onClick }: ReportRowProps) {
  return (
    <div 
      className={`${styles.tableRow} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
    >
      <div className={styles.reportName}>
        <div className={`${styles.reportIcon} ${styles[report.type]}`}>
          <FileTypeIcon type={report.type} />
        </div>
        <div className={styles.reportInfo}>
          <span className={styles.reportTitle}>{report.name}</span>
          {report.description && (
            <span className={styles.reportDescription}>{report.description}</span>
          )}
        </div>
      </div>
      <span className={styles.reportType}>{report.type}</span>
      <StatusBadge status={report.status} />
      <span className={styles.reportSize}>
        {report.fileSize ? formatFileSize(report.fileSize) : '—'}
      </span>
      <span className={styles.reportDate}>
        {report.createdAt.toLocaleDateString()}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const labels: Record<ReportStatus, string> = {
    ready: 'Ready',
    generating: 'Generating',
    failed: 'Failed',
  };

  return (
    <span className={`${styles.statusBadge} ${styles[status]}`}>
      <span className={styles.statusDot} />
      {labels[status]}
    </span>
  );
}

interface ReportInspectorProps {
  report: Report;
  onDelete: () => void;
  onShare: () => void;
  onRevokeShare: () => void;
}

function ReportInspector({ report, onDelete, onShare, onRevokeShare }: ReportInspectorProps) {
  const handleCopyLink = () => {
    if (report.shareLink) {
      navigator.clipboard.writeText(report.shareLink);
    }
  };

  return (
    <div className={styles.inspector}>
      <div className={styles.inspectorHeader}>
        <span className={styles.inspectorTitle}>{report.name}</span>
        <StatusBadge status={report.status} />
      </div>
      
      <div className={styles.inspectorContent}>
        {/* Description */}
        {report.description && (
          <div className={styles.inspectorSection}>
            <div className={styles.sectionTitle}>Description</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              {report.description}
            </p>
          </div>
        )}

        {/* Details */}
        <div className={styles.inspectorSection}>
          <div className={styles.sectionTitle}>Details</div>
          <div className={styles.detailsList}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Type</span>
              <span className={styles.detailValue}>{report.type.toUpperCase()}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Size</span>
              <span className={styles.detailValue}>
                {report.fileSize ? formatFileSize(report.fileSize) : 'Unknown'}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Owner</span>
              <span className={styles.detailValue}>{report.owner}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Created</span>
              <span className={styles.detailValue}>
                {report.createdAt.toLocaleDateString()}
              </span>
            </div>
            {report.runId && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Source Run</span>
                <span className={styles.detailValue}>{report.runId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sharing */}
        <div className={styles.inspectorSection}>
          <div className={styles.sectionTitle}>Sharing</div>
          <div className={styles.shareSection}>
            {report.shareLink ? (
              <>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                  This report has a public share link
                </p>
                <div className={styles.shareLink}>
                  <input 
                    type="text" 
                    className={styles.shareLinkInput}
                    value={report.shareLink}
                    readOnly
                  />
                  <button className={styles.copyButton} onClick={handleCopyLink} title="Copy link">
                    <CopyIcon />
                  </button>
                </div>
                <button 
                  className="btn btn-secondary" 
                  style={{ marginTop: 'var(--space-2)', width: '100%' }}
                  onClick={onRevokeShare}
                >
                  Revoke Link
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
                  Create a public link to share this report
                </p>
                <button 
                  className="btn btn-secondary" 
                  style={{ marginTop: 'var(--space-2)', width: '100%' }}
                  onClick={onShare}
                >
                  Create Share Link
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {report.error && (
          <div className={styles.inspectorSection}>
            <div className={styles.sectionTitle}>Error</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error-600)' }}>
              {report.error}
            </p>
          </div>
        )}
      </div>

      <div className={styles.inspectorActions}>
        {report.status === 'ready' && report.downloadUrl && (
          <a 
            href={report.downloadUrl} 
            className="btn btn-primary"
            download
          >
            Download
          </a>
        )}
        {report.status === 'generating' && (
          <button className="btn btn-secondary" disabled>
            Generating...
          </button>
        )}
        <button 
          className="btn btn-secondary"
          onClick={onDelete}
          style={{ color: 'var(--color-error-600)' }}
        >
          Delete Report
        </button>
      </div>
    </div>
  );
}

function EmptyState({ hasReports }: { hasReports: boolean }) {
  return (
    <div className={styles.emptyState}>
      <ReportEmptyIcon className={styles.emptyIcon} />
      <h2 className={styles.emptyTitle}>
        {hasReports ? 'No matching reports' : 'No reports yet'}
      </h2>
      <p className={styles.emptyDescription}>
        {hasReports 
          ? 'Try adjusting your search or filters to find what you\'re looking for.'
          : 'Generate your first report from a projection run or export data.'
        }
      </p>
    </div>
  );
}

function NoSelection() {
  return (
    <div className={styles.noSelection}>
      <SelectIcon className={styles.noSelectionIcon} />
      <p>Select a report to view details</p>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ============================================================
// Icons
// ============================================================

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11l3 3" strokeLinecap="round" />
    </svg>
  );
}

function FileTypeIcon({ type }: { type: ReportType }) {
  const icons: Record<ReportType, JSX.Element> = {
    pdf: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4 1h6l4 4v10H2V1h2zm6 0v4h4M5 9h6M5 11h4" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
    ),
    csv: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4 1h6l4 4v10H2V1h2zm6 0v4h4M4 8h8M4 10h8M4 12h8" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
    ),
    parquet: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4 1h6l4 4v10H2V1h2zm6 0v4h4" stroke="currentColor" strokeWidth="1" fill="none" />
        <rect x="5" y="8" width="2" height="4" fill="currentColor" />
        <rect x="9" y="8" width="2" height="4" fill="currentColor" />
      </svg>
    ),
    geojson: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6" />
        <path d="M2 8h12M8 2c-2 2-2 10 0 12M8 2c2 2 2 10 0 12" />
      </svg>
    ),
    pmtiles: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="5" height="5" />
        <rect x="9" y="2" width="5" height="5" />
        <rect x="2" y="9" width="5" height="5" />
        <rect x="9" y="9" width="5" height="5" />
      </svg>
    ),
  };
  return icons[type];
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5" y="5" width="8" height="8" rx="1" />
      <path d="M3 11V3a1 1 0 011-1h8" strokeLinecap="round" />
    </svg>
  );
}

function ReportEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M16 8h20l12 12v36a2 2 0 01-2 2H16a2 2 0 01-2-2V10a2 2 0 012-2z" />
      <path d="M36 8v12h12" />
      <path d="M24 28h16M24 36h16M24 44h10" strokeLinecap="round" />
    </svg>
  );
}

function SelectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 8h16l8 8v24a2 2 0 01-2 2H12a2 2 0 01-2-2V10a2 2 0 012-2z" />
      <path d="M28 8v8h8" />
      <path d="M32 36l4-4-4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Export for routing
export { Reports as ReportsPlaceholder };
