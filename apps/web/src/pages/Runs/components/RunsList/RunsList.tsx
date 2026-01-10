/**
 * RunsList Component
 * 
 * Displays a list of runs with filtering and selection
 */

import { useNavigate } from 'react-router-dom';
import { useRunsStore, type RunStatus, type RunType } from '../../../../stores/runsStore';
import { StatusBadge, Button } from '../../../../components/ui';
import styles from './RunsList.module.css';

const formatDuration = (ms: number | undefined): string => {
  if (ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
};

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusBadgeStatus = (status: RunStatus): 'queued' | 'running' | 'done' | 'failed' => {
  return status;
};

export function RunsList() {
  const navigate = useNavigate();
  const {
    runs,
    selectedRunIds,
    filter,
    setFilter,
    toggleRunSelection,
    clearSelection,
    removeRun,
    getFilteredRuns,
    clearCompletedRuns,
  } = useRunsStore();

  const filteredRuns = getFilteredRuns();

  const handleRowClick = (runId: string) => {
    navigate(`/runs/${runId}`);
  };

  const handleDelete = (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this run?')) {
      removeRun(runId);
    }
  };

  const handleCompare = () => {
    if (selectedRunIds.length >= 2) {
      navigate('/runs/compare');
    }
  };

  if (runs.length === 0) {
    return (
      <div className={styles.runsList}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>▶️</div>
          <h3 className={styles.emptyTitle}>No runs yet</h3>
          <p className={styles.emptyDescription}>
            Start a projection from the Explore page to see your runs here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.runsList}>
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <select
            className={styles.filterSelect}
            value={filter.type}
            onChange={(e) => setFilter({ type: e.target.value as RunType | 'all' })}
          >
            <option value="all">All Types</option>
            <option value="projection">Projections</option>
            <option value="data_job">Data Jobs</option>
          </select>
          <select
            className={styles.filterSelect}
            value={filter.status}
            onChange={(e) => setFilter({ status: e.target.value as RunStatus | 'all' })}
          >
            <option value="all">All Status</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="done">Done</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className={styles.actionGroup}>
          {selectedRunIds.length > 0 && (
            <span className={styles.selectionBadge}>
              {selectedRunIds.length} selected
              <button onClick={clearSelection} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCompare}
            disabled={selectedRunIds.length < 2}
          >
            ⚖️ Compare
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCompletedRuns}
          >
            🗑️ Clear Completed
          </Button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCell}></th>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRuns.map((run) => (
              <tr
                key={run.id}
                className={`${styles.tableRow} ${selectedRunIds.includes(run.id) ? styles.selected : ''}`}
                onClick={() => handleRowClick(run.id)}
              >
                <td className={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={selectedRunIds.includes(run.id)}
                    onChange={() => toggleRunSelection(run.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td>
                  <div className={styles.runName}>
                    <span className={styles.runNameText}>{run.name}</span>
                    {run.description && (
                      <span className={styles.runDescription}>{run.description}</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`${styles.runType} ${styles[run.type]}`}>
                    {run.type === 'projection' ? '📊 Projection' : '🔧 Data Job'}
                  </span>
                </td>
                <td>
                  <StatusBadge
                    status={getStatusBadgeStatus(run.status)}
                    label={run.status}
                    size="sm"
                  />
                </td>
                <td>
                  <span className={styles.duration}>{formatDuration(run.durationMs)}</span>
                </td>
                <td>
                  <span className={styles.date}>{formatDate(run.createdAt)}</span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      title="View details"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/runs/${run.id}`);
                      }}
                    >
                      👁️
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.danger}`}
                      title="Delete"
                      onClick={(e) => handleDelete(e, run.id)}
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
