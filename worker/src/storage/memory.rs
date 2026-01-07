//! In-memory storage implementation.
//!
//! Useful for testing and MVP. Data is lost on restart.

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use super::traits::*;
use crate::engine::{Population, ProjectionResult, ProjectionYear, Scenario};

/// Thread-safe in-memory store
type Store<T> = Arc<RwLock<HashMap<String, T>>>;

/// In-memory scenario repository
pub struct MemoryScenarioRepository {
    store: Store<Scenario>,
}

impl MemoryScenarioRepository {
    pub fn new() -> Self {
        Self {
            store: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

#[async_trait]
impl ScenarioRepository for MemoryScenarioRepository {
    async fn save(&self, scenario: &Scenario) -> StorageResult<()> {
        let mut store = self.store.write().await;
        store.insert(scenario.id.clone(), scenario.clone());
        Ok(())
    }

    async fn get_by_id(&self, id: &str) -> StorageResult<Option<Scenario>> {
        let store = self.store.read().await;
        Ok(store.get(id).cloned())
    }

    async fn get_all(&self) -> StorageResult<Vec<Scenario>> {
        let store = self.store.read().await;
        Ok(store.values().cloned().collect())
    }

    async fn delete(&self, id: &str) -> StorageResult<()> {
        let mut store = self.store.write().await;
        store.remove(id);
        Ok(())
    }

    async fn exists(&self, id: &str) -> StorageResult<bool> {
        let store = self.store.read().await;
        Ok(store.contains_key(id))
    }
}

/// In-memory projection repository
pub struct MemoryProjectionRepository {
    store: Store<ProjectionResult>,
}

impl MemoryProjectionRepository {
    pub fn new() -> Self {
        Self {
            store: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

#[async_trait]
impl ProjectionRepository for MemoryProjectionRepository {
    async fn save_result(&self, scenario_id: &str, result: &ProjectionResult) -> StorageResult<()> {
        let mut store = self.store.write().await;
        store.insert(scenario_id.to_string(), result.clone());
        Ok(())
    }

    async fn get_result(&self, scenario_id: &str) -> StorageResult<Option<ProjectionResult>> {
        let store = self.store.read().await;
        Ok(store.get(scenario_id).cloned())
    }

    async fn get_year(&self, scenario_id: &str, year: u32) -> StorageResult<Option<ProjectionYear>> {
        let store = self.store.read().await;
        Ok(store
            .get(scenario_id)
            .and_then(|r| r.years.iter().find(|y| y.year == year).cloned()))
    }

    async fn get_year_range(
        &self,
        scenario_id: &str,
        start_year: u32,
        end_year: u32,
    ) -> StorageResult<Vec<ProjectionYear>> {
        let store = self.store.read().await;
        Ok(store
            .get(scenario_id)
            .map(|r| {
                r.years
                    .iter()
                    .filter(|y| y.year >= start_year && y.year <= end_year)
                    .cloned()
                    .collect()
            })
            .unwrap_or_default())
    }

    async fn delete_for_scenario(&self, scenario_id: &str) -> StorageResult<()> {
        let mut store = self.store.write().await;
        store.remove(scenario_id);
        Ok(())
    }

    async fn list_scenario_ids(&self) -> StorageResult<Vec<String>> {
        let store = self.store.read().await;
        Ok(store.keys().cloned().collect())
    }
}

/// In-memory population store
pub struct MemoryPopulationStore {
    /// Key: "scenario_id:year"
    store: Store<Population>,
}

impl MemoryPopulationStore {
    pub fn new() -> Self {
        Self {
            store: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    fn key(scenario_id: &str, year: u32) -> String {
        format!("{}:{}", scenario_id, year)
    }
}

#[async_trait]
impl PopulationStore for MemoryPopulationStore {
    async fn save(
        &self,
        scenario_id: &str,
        year: u32,
        population: &Population,
    ) -> StorageResult<()> {
        let mut store = self.store.write().await;
        store.insert(Self::key(scenario_id, year), population.clone());
        Ok(())
    }

    async fn get(&self, scenario_id: &str, year: u32) -> StorageResult<Option<Population>> {
        let store = self.store.read().await;
        Ok(store.get(&Self::key(scenario_id, year)).cloned())
    }

    async fn delete_for_scenario(&self, scenario_id: &str) -> StorageResult<()> {
        let mut store = self.store.write().await;
        let prefix = format!("{}:", scenario_id);
        store.retain(|k, _| !k.starts_with(&prefix));
        Ok(())
    }
}

/// Unified in-memory storage
pub struct MemoryStorage {
    scenarios: MemoryScenarioRepository,
    projections: MemoryProjectionRepository,
    populations: MemoryPopulationStore,
}

impl MemoryStorage {
    pub fn new() -> Self {
        Self {
            scenarios: MemoryScenarioRepository::new(),
            projections: MemoryProjectionRepository::new(),
            populations: MemoryPopulationStore::new(),
        }
    }
}

impl Default for MemoryStorage {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Storage for MemoryStorage {
    fn scenarios(&self) -> &dyn ScenarioRepository {
        &self.scenarios
    }

    fn projections(&self) -> &dyn ProjectionRepository {
        &self.projections
    }

    fn populations(&self) -> &dyn PopulationStore {
        &self.populations
    }

    async fn initialize(&self) -> StorageResult<()> {
        // Nothing to initialize for in-memory storage
        Ok(())
    }

    async fn close(&self) -> StorageResult<()> {
        // Nothing to close
        Ok(())
    }

    async fn is_healthy(&self) -> bool {
        true
    }

    fn get_backend_name(&self) -> &str {
        "memory"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine::ScenarioStatus;

    fn create_test_scenario(id: &str) -> Scenario {
        Scenario {
            id: id.to_string(),
            name: "Test Scenario".to_string(),
            description: None,
            base_year: 2024,
            end_year: 2050,
            regions: vec!["CZ".to_string()],
            shocks: vec![],
            status: ScenarioStatus::Draft,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        }
    }

    #[tokio::test]
    async fn test_scenario_crud() {
        let storage = MemoryStorage::new();
        let repo = storage.scenarios();

        let scenario = create_test_scenario("test-1");

        // Save
        repo.save(&scenario).await.unwrap();

        // Get
        let retrieved = repo.get_by_id("test-1").await.unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().name, "Test Scenario");

        // Exists
        assert!(repo.exists("test-1").await.unwrap());
        assert!(!repo.exists("nonexistent").await.unwrap());

        // Get all
        let all = repo.get_all().await.unwrap();
        assert_eq!(all.len(), 1);

        // Delete
        repo.delete("test-1").await.unwrap();
        assert!(!repo.exists("test-1").await.unwrap());
    }
}
