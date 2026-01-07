//! Storage trait definitions.
//!
//! These define the contract for database-agnostic persistence.

use async_trait::async_trait;
use thiserror::Error;

use crate::engine::{Population, ProjectionResult, ProjectionYear, Scenario};

/// Storage error types
#[derive(Debug, Error)]
pub enum StorageError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Already exists: {0}")]
    AlreadyExists(String),

    #[error("Connection error: {0}")]
    Connection(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Query error: {0}")]
    Query(String),

    #[error("Internal error: {0}")]
    Internal(#[from] anyhow::Error),
}

/// Storage operation result
pub type StorageResult<T> = Result<T, StorageError>;

/// Scenario repository - CRUD operations for scenarios
#[async_trait]
pub trait ScenarioRepository: Send + Sync {
    /// Save a scenario (insert or update)
    async fn save(&self, scenario: &Scenario) -> StorageResult<()>;

    /// Get a scenario by ID
    async fn get_by_id(&self, id: &str) -> StorageResult<Option<Scenario>>;

    /// Get all scenarios
    async fn get_all(&self) -> StorageResult<Vec<Scenario>>;

    /// Delete a scenario
    async fn delete(&self, id: &str) -> StorageResult<()>;

    /// Check if a scenario exists
    async fn exists(&self, id: &str) -> StorageResult<bool>;
}

/// Projection repository - stores projection results
#[async_trait]
pub trait ProjectionRepository: Send + Sync {
    /// Save complete projection result
    async fn save_result(&self, scenario_id: &str, result: &ProjectionResult) -> StorageResult<()>;

    /// Get full projection for a scenario
    async fn get_result(&self, scenario_id: &str) -> StorageResult<Option<ProjectionResult>>;

    /// Get single year from projection
    async fn get_year(&self, scenario_id: &str, year: u32) -> StorageResult<Option<ProjectionYear>>;

    /// Get year range
    async fn get_year_range(
        &self,
        scenario_id: &str,
        start_year: u32,
        end_year: u32,
    ) -> StorageResult<Vec<ProjectionYear>>;

    /// Delete all results for a scenario
    async fn delete_for_scenario(&self, scenario_id: &str) -> StorageResult<()>;

    /// List all scenario IDs with results
    async fn list_scenario_ids(&self) -> StorageResult<Vec<String>>;
}

/// Population store - stores population snapshots
#[async_trait]
pub trait PopulationStore: Send + Sync {
    /// Save population snapshot
    async fn save(
        &self,
        scenario_id: &str,
        year: u32,
        population: &Population,
    ) -> StorageResult<()>;

    /// Get population for specific year
    async fn get(&self, scenario_id: &str, year: u32) -> StorageResult<Option<Population>>;

    /// Delete all populations for a scenario
    async fn delete_for_scenario(&self, scenario_id: &str) -> StorageResult<()>;
}

/// Unified storage interface
#[async_trait]
pub trait Storage: Send + Sync {
    /// Get scenario repository
    fn scenarios(&self) -> &dyn ScenarioRepository;

    /// Get projection repository
    fn projections(&self) -> &dyn ProjectionRepository;

    /// Get population store
    fn populations(&self) -> &dyn PopulationStore;

    /// Initialize storage (create tables, etc.)
    async fn initialize(&self) -> StorageResult<()>;

    /// Clean shutdown
    async fn close(&self) -> StorageResult<()>;

    /// Health check
    async fn is_healthy(&self) -> bool;

    /// Get backend name
    fn get_backend_name(&self) -> &str;
}
