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
