/**
 * Scenarios Page - Scenario management
 */

import styles from './Scenarios.module.css';

export function ScenariosPlaceholder() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Scenarios</h1>
        <button className="btn btn-primary">+ New Scenario</button>
      </div>
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <div className={styles.icon}>📋</div>
          <h2>Scenario Library</h2>
          <p>Create and manage demographic projection scenarios</p>
          <p className={styles.note}>Coming in Phase 4</p>
        </div>
      </div>
    </div>
  );
}

export function ScenarioEditorPlaceholder() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Edit Scenario</h1>
      </div>
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <div className={styles.icon}>✏️</div>
          <h2>Scenario Editor</h2>
          <p>Configure scenario parameters and assumptions</p>
          <p className={styles.note}>Coming in Phase 4</p>
        </div>
      </div>
    </div>
  );
}

export { ScenariosPlaceholder as Scenarios };
