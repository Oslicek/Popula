/**
 * Explore Page - Main workbench
 * 
 * This is the primary working area with:
 * - Map canvas
 * - Inspector panel (Setup/Results/Notes)
 * - Overlay controls (metric, year, area, scenario)
 * 
 * TODO: Migrate Map.tsx and CzMap.tsx functionality here
 */

import styles from './Explore.module.css';

export function ExplorePlaceholder() {
  return (
    <div className={styles.explore}>
      <div className={styles.placeholder}>
        <div className={styles.icon}>🗺️</div>
        <h2>Explore</h2>
        <p>Main workbench with map, charts, and analysis tools</p>
        <div className={styles.features}>
          <div className={styles.feature}>
            <strong>Map Canvas</strong>
            <span>Geographic visualization with layers</span>
          </div>
          <div className={styles.feature}>
            <strong>Inspector Panel</strong>
            <span>Setup, Results, Notes tabs</span>
          </div>
          <div className={styles.feature}>
            <strong>Time Slider</strong>
            <span>Year-by-year animation</span>
          </div>
        </div>
        <p className={styles.note}>Coming in Phase 7</p>
      </div>
    </div>
  );
}

export { ExplorePlaceholder as Explore };
