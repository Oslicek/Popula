import { useParams } from 'react-router-dom';
import styles from './Scenario.module.css';

export function ScenarioPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';

  return (
    <div className={styles.scenario}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {isNew ? 'Create New Scenario' : 'Scenario Details'}
        </h1>
        {!isNew && (
          <span className={styles.scenarioId}>ID: {id}</span>
        )}
      </header>

      <div className={styles.content}>
        {isNew ? (
          <ScenarioBuilder />
        ) : (
          <ScenarioViewer scenarioId={id!} />
        )}
      </div>
    </div>
  );
}

function ScenarioBuilder() {
  return (
    <div className={styles.builder}>
      <div className={styles.placeholder}>
        <span className={styles.placeholderIcon}>🏗️</span>
        <h2>Scenario Builder</h2>
        <p>
          The scenario builder will allow you to:
        </p>
        <ul>
          <li>Set base year and projection range</li>
          <li>Select regions to include</li>
          <li>Add demographic shocks (pandemic, war, migration)</li>
          <li>Customize mortality and fertility rates</li>
          <li>Run projections and visualize results</li>
        </ul>
        <p className={styles.comingSoon}>
          Coming soon in the next iteration!
        </p>
      </div>
    </div>
  );
}

function ScenarioViewer({ scenarioId }: { scenarioId: string }) {
  return (
    <div className={styles.viewer}>
      <div className={styles.placeholder}>
        <span className={styles.placeholderIcon}>📊</span>
        <h2>Scenario Viewer</h2>
        <p>
          Viewing scenario: <code>{scenarioId}</code>
        </p>
        <p>
          This page will display:
        </p>
        <ul>
          <li>Population pyramid animation</li>
          <li>Time series charts</li>
          <li>Scenario parameters</li>
          <li>Export options</li>
        </ul>
      </div>
    </div>
  );
}

