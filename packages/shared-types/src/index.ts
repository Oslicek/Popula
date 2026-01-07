// Demographic types
export type {
  Gender,
  AgeGroup,
  Region,
  Cohort,
  PopulationMetadata,
  Population,
  MortalityRate,
  MortalityTable,
  FertilityRate,
  FertilityTable,
  MigrationProfileType,
  MigrationFlow,
  ShockType,
  Shock,
  Scenario,
  ScenarioSummary,
  ProjectionYear,
  ProjectionResult,
  ProjectionProgress,
  AggregationOptions,
  AggregatedPopulation,
  Mutable,
  NewScenario,
  NewShock,
} from './demographic';

export {
  singleYearAge,
  ageRange,
  isAgeInGroup,
  totalPopulation,
  medianAge,
} from './demographic';

// Shock types and helpers
export type {
  AgeRange,
  ShockTemplate,
  Modifier,
  MultiplierModifier,
  AbsoluteModifier,
  FunctionModifier,
} from './shock';

export {
  SHOCK_TEMPLATES,
  createShockFromTemplate,
  multiplier,
  absolute,
  additive,
  applyModifier,
  shockApplies,
  pandemicShock,
  warShock,
  migrationCrisisShock,
} from './shock';

// Message types
export type {
  MessageEnvelope,
  ErrorDetails,
  ErrorEnvelope,
  ScenarioSubmitPayload,
  ScenarioAcceptedPayload,
  ScenarioGetPayload,
  ScenarioGetResponsePayload,
  ScenarioListPayload,
  ScenarioListResponsePayload,
  ScenarioDeletePayload,
  ScenarioDeletedPayload,
  ProjectionPopulationRow,
  ProjectionMortalityRow,
  ProjectionFertilityRow,
  ProjectionMigrationRow,
  ProjectionRunRequest,
  ProjectionYearResult,
  InputDataStats,
  ProjectionRunResponse,
  ProjectionProgressPayload,
  ProjectionResultPayload,
  WorkerStatus,
  HealthPayload,
  StatusRequestPayload,
  ErrorCode,
  ScenarioSubmitMessage,
  ScenarioAcceptedMessage,
  ScenarioGetMessage,
  ScenarioListMessage,
  ScenarioDeleteMessage,
  ProjectionProgressMessage,
  ProjectionResultMessage,
  HealthMessage,
  ErrorMessage,
} from './messages';

export { 
  SUBJECTS, 
  ERROR_CODES,
  generateMessageId,
  createMessage,
  createError,
} from './messages';

// Storage types
export type {
  ScenarioRepository,
  ProjectionRepository,
  PopulationStore,
  Storage,
  StorageBackend,
  StorageConfigBase,
  MemoryStorageConfig,
  SqliteStorageConfig,
  DuckDbStorageConfig,
  NatsStorageConfig,
  StorageConfig,
  StorageFactory,
  StorageErrorType,
  StorageError,
} from './storage';

export {
  createStorageError,
  isStorageError,
} from './storage';

// Workspace types
export type {
  PopulationData,
  PopulationRow,
  MortalityData,
  MortalityRow,
  FertilityData,
  FertilityRow,
  MigrationData,
  MigrationRow,
  ImportStatus,
  DataImportState,
  ProjectionParameters,
  ProjectionStatus,
  ProjectionState,
  Workspace,
  WorkspaceSummary,
} from './workspace';

export {
  DEFAULT_PROJECTION_PARAMS,
  createWorkspace,
  isReadyForProjection,
  getWorkspaceValidationErrors,
  toWorkspaceSummary,
} from './workspace';
