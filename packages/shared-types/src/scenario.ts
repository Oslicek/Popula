/**
 * Scenario types for demographic projections.
 * A scenario defines the parameters for a projection run.
 */

import type { Shock } from './shock';
import type { MigrationFlow } from './demographic';

/**
 * Scenario status in the system.
 */
export type ScenarioStatus = 
  | 'draft'       // Being edited, not yet submitted
  | 'submitted'   // Sent to worker for processing
  | 'running'     // Projection in progress
  | 'completed'   // Projection finished successfully
  | 'failed';     // Projection failed with error

/**
 * Scenario definition.
 * Contains all parameters needed to run a demographic projection.
 */
export interface Scenario {
  /** Unique scenario identifier (UUID) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description?: string;
  /** Base year (projection starts from this year) */
  baseYear: number;
  /** End year (projection runs until this year, inclusive) */
  endYear: number;
  /** Regions to include in the projection */
  regions: string[];
  /** Shock modifiers to apply during projection */
  shocks: Shock[];
  /** Explicit migration flows (optional, overrides defaults) */
  migrationFlows?: MigrationFlow[];
  /** Scenario status */
  status: ScenarioStatus;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
}

/**
 * Scenario creation request (subset of Scenario).
 */
export interface CreateScenarioRequest {
  name: string;
  description?: string;
  baseYear: number;
  endYear: number;
  regions: string[];
  shocks?: Shock[];
  migrationFlows?: MigrationFlow[];
}

/**
 * Projection result for a single year.
 * Returned by the worker during and after projection.
 */
export interface ProjectionYear {
  /** Calendar year */
  year: number;
  /** Total population at end of year */
  totalPopulation: number;
  /** Births during the year */
  births: number;
  /** Deaths during the year */
  deaths: number;
  /** Net migration (positive = immigration > emigration) */
  netMigration: number;
  /** Natural increase (births - deaths) */
  naturalIncrease: number;
  /** Population growth rate (percentage) */
  growthRate: number;
  /** Total fertility rate (TFR) */
  totalFertilityRate: number;
  /** Life expectancy at birth (male) */
  lifeExpectancyMale: number;
  /** Life expectancy at birth (female) */
  lifeExpectancyFemale: number;
  /** Median age */
  medianAge: number;
}

/**
 * Complete projection result.
 * Contains all years of the projection.
 */
export interface ProjectionResult {
  /** Associated scenario ID */
  scenarioId: string;
  /** All projected years */
  years: ProjectionYear[];
  /** Computation time in milliseconds */
  computeTimeMs: number;
  /** Completion timestamp (ISO 8601) */
  completedAt: string;
}

/**
 * Projection progress update.
 * Sent by worker during long-running projections.
 */
export interface ProjectionProgress {
  /** Associated scenario ID */
  scenarioId: string;
  /** Current year being processed */
  currentYear: number;
  /** Completion percentage (0-100) */
  percentComplete: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemainingMs?: number;
}
