/**
 * RunDetail Component
 * 
 * Shows detailed view of a single run
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useRunsStore } from '../../../../stores/runsStore';
import { StatusBadge, Button } from '../../../../components/ui';
import styles from './RunDetail.module.css';

const formatDuration = (ms: number | undefined): string => {
  if (ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
};

const formatDate = (isoString: string | undefined): string => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const runs = useRunsStore((state) => state.runs ?? []);
  const removeRun = useRunsStore((state) => state.removeRun);
  const selectRun = useRunsStore((state) => state.selectRun);

  const run = id ? runs.find((r) => r.id === id) : undefined;

  if (!run) {
    return (
      <div className={styles.detail}>
        <div className={styles.notFound}>
          <div className={styles.notFoundIcon}>🔍</div>
          <h2 className={styles.notFoundTitle}>Run not found</h2>
          <p className={styles.notFoundDescription}>
            This run may have been deleted or doesn't exist
          </p>
          <Button onClick={() => navigate('/runs')}>
            ← Back to Runs
          </Button>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this run?')) {
      removeRun(run.id);
      navigate('/runs');
    }
  };

  const handleAddToComparison = () => {
    selectRun(run.id);
    navigate('/runs/compare');
  };

  return (
    <div className={styles.detail}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backButton} onClick={() => navigate('/runs')}>
            ←
          </button>
          <div className={styles.headerInfo}>
            <h1 className={styles.runTitle}>{run.name}</h1>
            <div className={styles.runMeta}>
              <span>{run.type === 'projection' ? '📊 Projection' : '🔧 Data Job'}</span>
              <span>•</span>
              <span>Created {formatDate(run.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <StatusBadge status={run.status} label={run.status} />
          <Button variant="secondary" size="sm" onClick={handleAddToComparison}>
            ⚖️ Compare
          </Button>
          <Button variant="secondary" size="sm" disabled>
            📥 Export
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            🗑️ Delete
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.grid}>
          {/* Main column */}
          <div>
            {/* Error banner if failed */}
            {run.status === 'failed' && run.error && (
              <div className={styles.errorBanner} style={{ marginBottom: 'var(--space-4)' }}>
                <div className={styles.errorTitle}>⚠️ Run Failed</div>
                <div className={styles.errorMessage}>{run.error}</div>
              </div>
            )}

            {/* Configuration */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Configuration</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.configGrid}>
                  <div className={styles.configItem}>
                    <span className={styles.configLabel}>Project</span>
                    <span className={styles.configValue}>{run.projectId || 'Default'}</span>
                  </div>
                  <div className={styles.configItem}>
                    <span className={styles.configLabel}>Scenario</span>
                    <span className={styles.configValue}>{run.scenarioId || 'Baseline'}</span>
                  </div>
                  <div className={styles.configItem}>
                    <span className={styles.configLabel}>Base Year</span>
                    <span className={styles.configValue}>{run.baseYear ?? '—'}</span>
                  </div>
                  <div className={styles.configItem}>
                    <span className={styles.configLabel}>End Year</span>
                    <span className={styles.configValue}>{run.endYear ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            {run.resultSummary && (
              <div className={styles.card} style={{ marginTop: 'var(--space-4)' }}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Results Summary</h3>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.resultsGrid}>
                    <div className={styles.resultItem}>
                      <div className={styles.resultValue}>
                        {run.resultSummary.totalPopulation?.toLocaleString() ?? '—'}
                      </div>
                      <div className={styles.resultLabel}>Final Population</div>
                    </div>
                    <div className={styles.resultItem}>
                      <div className={styles.resultValue}>
                        {run.resultSummary.yearsProjected ?? '—'}
                      </div>
                      <div className={styles.resultLabel}>Years Projected</div>
                    </div>
                    <div className={styles.resultItem}>
                      <div className={styles.resultValue}>
                        {run.resultSummary.regionsProcessed ?? '—'}
                      </div>
                      <div className={styles.resultLabel}>Regions</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Timeline */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Timeline</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.timeline}>
                  <div className={styles.timelineItem}>
                    <div className={`${styles.timelineDot} ${styles.active}`}></div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineTitle}>Created</div>
                      <div className={styles.timelineTime}>{formatDate(run.createdAt)}</div>
                    </div>
                  </div>
                  {run.startedAt && (
                    <div className={styles.timelineItem}>
                      <div className={`${styles.timelineDot} ${styles.active}`}></div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTitle}>Started</div>
                        <div className={styles.timelineTime}>{formatDate(run.startedAt)}</div>
                      </div>
                    </div>
                  )}
                  {run.completedAt && (
                    <div className={styles.timelineItem}>
                      <div className={`${styles.timelineDot} ${run.status === 'failed' ? styles.error : styles.active}`}></div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTitle}>
                          {run.status === 'failed' ? 'Failed' : 'Completed'}
                        </div>
                        <div className={styles.timelineTime}>{formatDate(run.completedAt)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className={styles.card} style={{ marginTop: 'var(--space-4)' }}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Performance</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.configGrid}>
                  <div className={styles.configItem}>
                    <span className={styles.configLabel}>Duration</span>
                    <span className={styles.configValue}>{formatDuration(run.durationMs)}</span>
                  </div>
                  <div className={styles.configItem}>
                    <span className={styles.configLabel}>Status</span>
                    <span className={styles.configValue}>{run.status}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
