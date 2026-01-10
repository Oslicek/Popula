/**
 * Runs Page - Run history and comparison
 */

import { useNavigate } from 'react-router-dom';
import { useRunsStore, selectQueuedRuns, selectRunningRuns, selectCompletedRuns, selectFailedRuns, selectSelectedRuns } from '../../stores/runsStore';
import { RunsList, RunDetail } from './components';
import { Button } from '../../components/ui';
import styles from './Runs.module.css';

export function Runs() {
  const queuedCount = useRunsStore(selectQueuedRuns).length;
  const runningCount = useRunsStore(selectRunningRuns).length;
  const doneCount = useRunsStore(selectCompletedRuns).length;
  const failedCount = useRunsStore(selectFailedRuns).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Runs</h1>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.queued}`}>{queuedCount}</span>
              <span>Queued</span>
            </div>
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.running}`}>{runningCount}</span>
              <span>Running</span>
            </div>
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.done}`}>{doneCount}</span>
              <span>Done</span>
            </div>
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.failed}`}>{failedCount}</span>
              <span>Failed</span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.content}>
        <RunsList />
      </div>
    </div>
  );
}

export function RunDetailPage() {
  return <RunDetail />;
}

export function CompareView() {
  const navigate = useNavigate();
  const selectedRuns = useRunsStore(selectSelectedRuns);
  const { deselectRun, clearSelection } = useRunsStore();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/runs')}>
            ← Back
          </Button>
          <h1 className={styles.title}>Compare Runs</h1>
        </div>
        {selectedRuns.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Clear Selection
          </Button>
        )}
      </div>
      <div className={styles.content}>
        <div className={styles.comparePlaceholder}>
          <div className={styles.compareIcon}>⚖️</div>
          <h2 className={styles.compareTitle}>Run Comparison</h2>
          <p className={styles.compareDescription}>
            Compare 2-4 runs side by side with synchronized time sliders, map overlays, and metrics tables.
          </p>
          
          {selectedRuns.length > 0 ? (
            <>
              <div className={styles.selectedRunsList}>
                {selectedRuns.map((run) => (
                  <div key={run.id} className={styles.selectedRunBadge}>
                    <span>{run.name}</span>
                    <button
                      className={styles.removeButton}
                      onClick={() => deselectRun(run.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {selectedRuns.length < 2 && (
                <p className={styles.comingSoon}>
                  Select at least 2 runs to compare
                </p>
              )}
              {selectedRuns.length >= 2 && (
                <p className={styles.comingSoon}>
                  Comparison view coming soon
                </p>
              )}
            </>
          ) : (
            <p className={styles.comingSoon}>
              Select runs from the Runs list to compare
            </p>
          )}
          
          <Button variant="secondary" onClick={() => navigate('/runs')} style={{ marginTop: 'var(--space-4)' }}>
            ← Back to Runs
          </Button>
        </div>
      </div>
    </div>
  );
}

// Legacy exports for compatibility
export { Runs as RunsPlaceholder };
export { RunDetailPage as RunDetailPlaceholder };
export { CompareView as CompareViewPlaceholder };
