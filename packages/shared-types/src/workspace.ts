/**
 * Workspace Types
 * 
 * A workspace represents a single demographic project (country, city, region).
 * Users can create unlimited workspaces and import data into each.
 */

import type { ProjectionYear } from './demographic';
import type { InputDataStats } from './messages';

// ============================================================
// Data Import Types
// ============================================================

/**
 * Parsed population data from CSV
 * CSV format: age,male,female
 */
export interface PopulationData {
  readonly rows: PopulationRow[];
  readonly totalMale: number;
  readonly totalFemale: number;
  readonly total: number;
}

export interface PopulationRow {
  readonly age: number;
  readonly male: number;
  readonly female: number;
}

/**
 * Parsed mortality data from CSV
 * CSV format: age,male,female
 */
export interface MortalityData {
  readonly rows: MortalityRow[];
}

export interface MortalityRow {
  readonly age: number;
  readonly male: number;  // probability of death (0-1)
  readonly female: number;
}

/**
 * Parsed fertility data from CSV
 * CSV format: age,rate
 */
export interface FertilityData {
  readonly rows: FertilityRow[];
  readonly totalFertilityRate: number;  // Sum of all age-specific rates
}

export interface FertilityRow {
  readonly age: number;
  readonly rate: number;  // births per woman per year
}

/**
 * Parsed migration data from CSV
 * CSV format: age,male,female
 */
export interface MigrationData {
  readonly rows: MigrationRow[];
  readonly netMale: number;
  readonly netFemale: number;
  readonly netTotal: number;
}

export interface MigrationRow {
  readonly age: number;
  readonly male: number;   // net migrants (positive = immigration)
  readonly female: number;
}

// ============================================================
// Import Status
// ============================================================

export type ImportStatus = 'empty' | 'loaded' | 'error';

export interface DataImportState {
  readonly status: ImportStatus;
  readonly fileName?: string;
  readonly rowCount?: number;
  readonly error?: string;
}

// ============================================================
// Projection Parameters
// ============================================================

export interface ProjectionParameters {
  readonly baseYear: number;
  readonly endYear: number;
  readonly sexRatioAtBirth: number;  // Males per 100 females (typically 105)
}

export const DEFAULT_PROJECTION_PARAMS: ProjectionParameters = {
  baseYear: 2024,
  endYear: 2050,
  sexRatioAtBirth: 105.0,
};

// ============================================================
// Projection Status
// ============================================================

export type ProjectionStatus = 
  | 'idle'           // Not started
  | 'running'        // In progress
  | 'completed'      // Finished successfully
  | 'error';         // Failed

export interface ProjectionState {
  readonly status: ProjectionStatus;
  readonly currentYear?: number;
  readonly progress?: number;  // 0-100
  readonly error?: string;
  readonly results?: ProjectionYear[];
  readonly processingTimeMs?: number;
  readonly inputStats?: InputDataStats;
  readonly completedAt?: string;  // ISO date
}

// ============================================================
// Workspace
// ============================================================

export interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly createdAt: string;  // ISO date
  readonly updatedAt: string;  // ISO date
  
  // Imported data
  readonly population: PopulationData | null;
  readonly mortality: MortalityData | null;
  readonly fertility: FertilityData | null;
  readonly migration: MigrationData | null;
  
  // Import status for each data type
  readonly populationImport: DataImportState;
  readonly mortalityImport: DataImportState;
  readonly fertilityImport: DataImportState;
  readonly migrationImport: DataImportState;
  
  // Projection settings
  readonly parameters: ProjectionParameters;
  
  // Projection state
  readonly projection: ProjectionState;
}

/**
 * Create a new empty workspace
 */
export function createWorkspace(name: string, description?: string): Workspace {
  const now = new Date().toISOString();
  return {
    id: generateWorkspaceId(),
    name,
    description,
    createdAt: now,
    updatedAt: now,
    population: null,
    mortality: null,
    fertility: null,
    migration: null,
    populationImport: { status: 'empty' },
    mortalityImport: { status: 'empty' },
    fertilityImport: { status: 'empty' },
    migrationImport: { status: 'empty' },
    parameters: DEFAULT_PROJECTION_PARAMS,
    projection: { status: 'idle' },
  };
}

/**
 * Generate a unique workspace ID
 */
function generateWorkspaceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ws_${timestamp}_${random}`;
}

/**
 * Check if workspace has all required data for projection
 */
export function isReadyForProjection(workspace: Workspace): boolean {
  return (
    workspace.population !== null &&
    workspace.mortality !== null &&
    workspace.fertility !== null
    // Migration is optional
  );
}

/**
 * Get workspace validation errors
 */
export function getWorkspaceValidationErrors(workspace: Workspace): string[] {
  const errors: string[] = [];
  
  if (!workspace.population) {
    errors.push('Population data is required');
  }
  if (!workspace.mortality) {
    errors.push('Mortality data is required');
  }
  if (!workspace.fertility) {
    errors.push('Fertility data is required');
  }
  if (workspace.parameters.baseYear >= workspace.parameters.endYear) {
    errors.push('End year must be greater than base year');
  }
  if (workspace.parameters.sexRatioAtBirth <= 0) {
    errors.push('Sex ratio at birth must be positive');
  }
  
  return errors;
}

// ============================================================
// Workspace Summary (for listing)
// ============================================================

export interface WorkspaceSummary {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly hasPopulation: boolean;
  readonly hasMortality: boolean;
  readonly hasFertility: boolean;
  readonly hasMigration: boolean;
  readonly projectionStatus: ProjectionStatus;
}

/**
 * Create a summary from a workspace
 */
export function toWorkspaceSummary(workspace: Workspace): WorkspaceSummary {
  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    hasPopulation: workspace.population !== null,
    hasMortality: workspace.mortality !== null,
    hasFertility: workspace.fertility !== null,
    hasMigration: workspace.migration !== null,
    projectionStatus: workspace.projection.status,
  };
}

