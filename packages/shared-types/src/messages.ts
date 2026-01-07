import type { 
  Scenario, 
  ProjectionResult, 
  ProjectionProgress,
  NewScenario 
} from './demographic';

// ============================================================
// MESSAGE ENVELOPE
// ============================================================

/** Base message envelope - wraps all messages */
export interface MessageEnvelope<T> {
  readonly id: string;            // Unique message ID (UUID v4)
  readonly timestamp: string;     // ISO 8601 timestamp
  readonly correlationId: string; // Links related messages (request/response)
  readonly payload: T;
}

/** Error details */
export interface ErrorDetails {
  readonly code: string;          // Machine-readable error code
  readonly message: string;       // Human-readable message
  readonly details?: unknown;     // Additional context (optional)
}

/** Error message envelope */
export interface ErrorEnvelope {
  readonly id: string;
  readonly timestamp: string;
  readonly correlationId: string;
  readonly error: ErrorDetails;
}

// ============================================================
// MESSAGE SUBJECTS (NATS Topics)
// ============================================================

/**
 * NATS subject naming convention:
 * 
 * popula.<domain>.<action>           - Commands/requests
 * popula.<domain>.<id>.<event>       - Events for specific entity
 * popula.<domain>.events             - Broadcast events
 */
export const SUBJECTS = {
  // Scenario commands
  SCENARIO_SUBMIT: 'popula.scenario.submit',
  SCENARIO_DELETE: 'popula.scenario.delete',
  SCENARIO_LIST: 'popula.scenario.list',
  SCENARIO_GET: 'popula.scenario.get',
  
  // Scenario events (use template: popula.scenario.<id>.<event>)
  scenarioAccepted: (id: string) => `popula.scenario.${id}.accepted`,
  scenarioDeleted: (id: string) => `popula.scenario.${id}.deleted`,
  scenarioError: (id: string) => `popula.scenario.${id}.error`,
  
  // Projection commands (request/reply pattern)
  PROJECTION_RUN: 'popula.projection.run',
  
  // Projection events (use template: popula.projection.<id>.<event>)
  projectionProgress: (scenarioId: string) => `popula.projection.${scenarioId}.progress`,
  projectionResult: (scenarioId: string) => `popula.projection.${scenarioId}.result`,
  projectionError: (scenarioId: string) => `popula.projection.${scenarioId}.error`,
  
  // System
  SYSTEM_HEALTH: 'popula.system.health',
  SYSTEM_STATUS: 'popula.system.status',
} as const;

// ============================================================
// SCENARIO MESSAGES
// ============================================================

/** Submit a new scenario for projection */
export interface ScenarioSubmitPayload {
  readonly scenario: NewScenario;
  readonly runProjection: boolean; // If true, immediately run projection
}

/** Scenario accepted response */
export interface ScenarioAcceptedPayload {
  readonly scenario: Scenario;
  readonly projectionQueued: boolean;
}

/** Get scenario by ID request */
export interface ScenarioGetPayload {
  readonly scenarioId: string;
}

/** Get scenario response */
export interface ScenarioGetResponsePayload {
  readonly scenario: Scenario | null;
}

/** List scenarios request */
export interface ScenarioListPayload {
  readonly limit?: number;
  readonly offset?: number;
}

/** List scenarios response */
export interface ScenarioListResponsePayload {
  readonly scenarios: Scenario[];
  readonly total: number;
}

/** Delete scenario request */
export interface ScenarioDeletePayload {
  readonly scenarioId: string;
}

/** Delete scenario response */
export interface ScenarioDeletedPayload {
  readonly scenarioId: string;
  readonly success: boolean;
}

// ============================================================
// PROJECTION MESSAGES
// ============================================================

/** Population row for projection input */
export interface ProjectionPopulationRow {
  readonly age: number;
  readonly male: number;
  readonly female: number;
}

/** Mortality row for projection input */
export interface ProjectionMortalityRow {
  readonly age: number;
  readonly male: number;  // probability 0-1
  readonly female: number;
}

/** Fertility row for projection input */
export interface ProjectionFertilityRow {
  readonly age: number;
  readonly rate: number;  // births per woman per year
}

/** Migration row for projection input */
export interface ProjectionMigrationRow {
  readonly age: number;
  readonly male: number;   // net migrants (can be negative)
  readonly female: number;
}

/** Run projection request payload */
export interface ProjectionRunRequest {
  readonly workspaceId: string;
  readonly baseYear: number;
  readonly endYear: number;
  readonly sexRatioAtBirth: number;  // males per 100 females
  readonly population: ProjectionPopulationRow[];
  readonly mortality: ProjectionMortalityRow[];
  readonly fertility: ProjectionFertilityRow[];
  readonly migration?: ProjectionMigrationRow[];  // optional
}

/** Single year result */
export interface ProjectionYearResult {
  readonly year: number;
  readonly totalPopulation: number;
  readonly births: number;
  readonly deaths: number;
  readonly netMigration: number;
  readonly naturalChange: number;
  readonly growthRate: number;
}

/** Run projection response payload */
export interface ProjectionRunResponse {
  readonly workspaceId: string;
  readonly success: boolean;
  readonly years: ProjectionYearResult[];
  readonly error?: string;
  readonly processingTimeMs: number;
}

/** Projection progress update */
export interface ProjectionProgressPayload extends ProjectionProgress {}

/** Projection result */
export interface ProjectionResultPayload {
  readonly result: ProjectionResult;
}

// ============================================================
// SYSTEM MESSAGES
// ============================================================

/** Worker health status */
export type WorkerStatus = 'healthy' | 'degraded' | 'unhealthy';

/** Health check response */
export interface HealthPayload {
  readonly status: WorkerStatus;
  readonly uptime: number;          // Seconds since start
  readonly version: string;
  readonly activeJobs: number;
  readonly storage: {
    readonly backend: string;
    readonly healthy: boolean;
  };
}

/** System status request (no payload needed) */
export type StatusRequestPayload = Record<string, never>;

// ============================================================
// ERROR CODES
// ============================================================

export const ERROR_CODES = {
  // Validation errors (4xx equivalent)
  INVALID_SCENARIO: 'INVALID_SCENARIO',
  INVALID_YEAR_RANGE: 'INVALID_YEAR_RANGE',
  INVALID_REGION: 'INVALID_REGION',
  INVALID_SHOCK: 'INVALID_SHOCK',
  SCENARIO_NOT_FOUND: 'SCENARIO_NOT_FOUND',
  
  // Processing errors (5xx equivalent)
  PROJECTION_FAILED: 'PROJECTION_FAILED',
  STORAGE_ERROR: 'STORAGE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  
  // System errors
  NATS_CONNECTION_ERROR: 'NATS_CONNECTION_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// ============================================================
// MESSAGE TYPE ALIASES
// ============================================================

export type ScenarioSubmitMessage = MessageEnvelope<ScenarioSubmitPayload>;
export type ScenarioAcceptedMessage = MessageEnvelope<ScenarioAcceptedPayload>;
export type ScenarioGetMessage = MessageEnvelope<ScenarioGetPayload>;
export type ScenarioListMessage = MessageEnvelope<ScenarioListPayload>;
export type ScenarioDeleteMessage = MessageEnvelope<ScenarioDeletePayload>;

export type ProjectionProgressMessage = MessageEnvelope<ProjectionProgressPayload>;
export type ProjectionResultMessage = MessageEnvelope<ProjectionResultPayload>;

export type HealthMessage = MessageEnvelope<HealthPayload>;
export type ErrorMessage = ErrorEnvelope;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/** Generate a unique message ID */
export function generateMessageId(): string {
  return crypto.randomUUID();
}

/** Create a message envelope */
export function createMessage<T>(
  payload: T,
  correlationId?: string
): MessageEnvelope<T> {
  return {
    id: generateMessageId(),
    timestamp: new Date().toISOString(),
    correlationId: correlationId ?? generateMessageId(),
    payload,
  };
}

/** Create an error envelope */
export function createError(
  code: ErrorCode,
  message: string,
  correlationId: string,
  details?: unknown
): ErrorEnvelope {
  return {
    id: generateMessageId(),
    timestamp: new Date().toISOString(),
    correlationId,
    error: { code, message, details },
  };
}
