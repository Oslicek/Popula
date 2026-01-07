import type { 
  Scenario, 
  ProjectionResult, 
  ProjectionYear,
  Population,
  AggregationOptions,
  AggregatedPopulation,
  ScenarioSummary
} from './demographic';

// ============================================================
// STORAGE INTERFACES
// ============================================================

/**
 * Scenario storage - CRUD for scenario definitions
 */
export interface ScenarioRepository {
  /** Save a scenario (insert or update) */
  save(scenario: Scenario): Promise<void>;
  
  /** Get scenario by ID */
  getById(id: string): Promise<Scenario | null>;
  
  /** Get all scenarios */
  getAll(): Promise<Scenario[]>;
  
  /** Get scenario summaries (lightweight listing) */
  getSummaries(): Promise<ScenarioSummary[]>;
  
  /** Delete a scenario */
  delete(id: string): Promise<void>;
  
  /** Check if scenario exists */
  exists(id: string): Promise<boolean>;
}

/**
 * Projection results storage - append-only time series
 */
export interface ProjectionRepository {
  /** Save complete projection result */
  saveResult(scenarioId: string, result: ProjectionResult): Promise<void>;
  
  /** Get full projection for a scenario */
  getResult(scenarioId: string): Promise<ProjectionResult | null>;
  
  /** Get single year from projection (for large datasets) */
  getYear(scenarioId: string, year: number): Promise<ProjectionYear | null>;
  
  /** Get year range (efficient for visualizations) */
  getYearRange(
    scenarioId: string, 
    startYear: number, 
    endYear: number
  ): Promise<ProjectionYear[]>;
  
  /** Delete all results for a scenario */
  deleteForScenario(scenarioId: string): Promise<void>;
  
  /** List all scenarios with results */
  listScenarioIds(): Promise<string[]>;
  
  /** Check if projection exists for scenario */
  exists(scenarioId: string): Promise<boolean>;
}

/**
 * Population snapshots - point-in-time population states
 */
export interface PopulationStore {
  /** Save population snapshot */
  save(
    scenarioId: string, 
    year: number, 
    population: Population
  ): Promise<void>;
  
  /** Get population for specific year */
  get(scenarioId: string, year: number): Promise<Population | null>;
  
  /** Get aggregated data (for pyramids, charts) */
  getAggregated(
    scenarioId: string,
    year: number,
    options: AggregationOptions
  ): Promise<AggregatedPopulation[]>;
  
  /** Delete all populations for a scenario */
  deleteForScenario(scenarioId: string): Promise<void>;
  
  /** List available years for a scenario */
  listYears(scenarioId: string): Promise<number[]>;
}

// ============================================================
// UNIFIED STORAGE INTERFACE
// ============================================================

/**
 * Unified storage interface combining all repositories
 */
export interface Storage {
  /** Scenario repository */
  readonly scenarios: ScenarioRepository;
  
  /** Projection results repository */
  readonly projections: ProjectionRepository;
  
  /** Population snapshots store */
  readonly populations: PopulationStore;
  
  /** Initialize storage (create tables, etc.) */
  initialize(): Promise<void>;
  
  /** Clean shutdown */
  close(): Promise<void>;
  
  /** Health check */
  isHealthy(): Promise<boolean>;
  
  /** Get storage backend name */
  getBackendName(): string;
}

// ============================================================
// STORAGE CONFIGURATION
// ============================================================

/** Supported storage backends */
export type StorageBackend = 'memory' | 'sqlite' | 'duckdb' | 'nats';

/** Base storage configuration */
export interface StorageConfigBase {
  readonly backend: StorageBackend;
}

/** Memory storage config (no additional options) */
export interface MemoryStorageConfig extends StorageConfigBase {
  readonly backend: 'memory';
}

/** SQLite storage config */
export interface SqliteStorageConfig extends StorageConfigBase {
  readonly backend: 'sqlite';
  readonly path: string;  // File path or ':memory:'
}

/** DuckDB storage config */
export interface DuckDbStorageConfig extends StorageConfigBase {
  readonly backend: 'duckdb';
  readonly path: string;  // File path or ':memory:'
}

/** NATS JetStream storage config */
export interface NatsStorageConfig extends StorageConfigBase {
  readonly backend: 'nats';
  readonly url: string;
  readonly streamPrefix: string;
}

/** Union of all storage configs */
export type StorageConfig = 
  | MemoryStorageConfig 
  | SqliteStorageConfig 
  | DuckDbStorageConfig 
  | NatsStorageConfig;

// ============================================================
// STORAGE FACTORY TYPE
// ============================================================

/**
 * Factory function type for creating storage instances
 */
export type StorageFactory = (config: StorageConfig) => Promise<Storage>;

// ============================================================
// STORAGE ERRORS
// ============================================================

/** Storage error types */
export type StorageErrorType = 
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'CONNECTION_FAILED'
  | 'QUERY_FAILED'
  | 'SERIALIZATION_FAILED'
  | 'INITIALIZATION_FAILED';

/** Storage error */
export interface StorageError {
  readonly type: StorageErrorType;
  readonly message: string;
  readonly cause?: Error;
}

/** Create a storage error */
export function createStorageError(
  type: StorageErrorType,
  message: string,
  cause?: Error
): StorageError {
  return { type, message, cause };
}

/** Type guard for StorageError */
export function isStorageError(error: unknown): error is StorageError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error
  );
}
