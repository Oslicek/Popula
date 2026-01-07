//! Storage Module
//!
//! Provides a database-agnostic storage layer with multiple backend options.

mod traits;
mod memory;

pub use traits::*;
pub use memory::MemoryStorage;

use anyhow::Result;

/// Storage configuration
#[derive(Debug, Clone)]
pub enum StorageConfig {
    /// In-memory storage (for testing/MVP)
    Memory,
    /// SQLite file storage
    Sqlite { path: String },
    /// DuckDB file storage
    DuckDb { path: String },
}

/// Create a storage instance based on configuration
pub async fn create_storage(config: &StorageConfig) -> Result<Box<dyn Storage>> {
    match config {
        StorageConfig::Memory => {
            Ok(Box::new(MemoryStorage::new()))
        }
        StorageConfig::Sqlite { path } => {
            todo!("SQLite adapter not yet implemented: {}", path)
        }
        StorageConfig::DuckDb { path } => {
            todo!("DuckDB adapter not yet implemented: {}", path)
        }
    }
}
