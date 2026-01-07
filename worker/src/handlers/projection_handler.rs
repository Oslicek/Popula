//! Projection handler - runs CCM projections via NATS.
//!
//! Receives projection requests with demographic data, runs the CCM engine,
//! and returns year-by-year results.

use async_nats::Client;
use serde::{Deserialize, Serialize};
use tracing::{info, error};
use anyhow::Result;
use chrono::Utc;
use uuid::Uuid;
use futures::StreamExt;
use std::time::Instant;

use crate::engine::{
    CohortComponentModel,
    Cohort, 
    Gender, 
    MortalityTable, 
    MortalityRate, 
    FertilityTable, 
    FertilityRate, 
    MigrationTable, 
    MigrationRate
};

/// NATS subject for projection requests
pub const SUBJECT_PROJECTION_RUN: &str = "popula.projection.run";

// ============================================================
// Request/Response Types (match TypeScript definitions)
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PopulationRow {
    pub age: u32,
    pub male: f64,
    pub female: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MortalityRow {
    pub age: u32,
    pub male: f64,
    pub female: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FertilityRow {
    pub age: u32,
    pub rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationRow {
    pub age: u32,
    pub male: f64,
    pub female: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectionRunRequest {
    pub workspace_id: String,
    pub base_year: u32,
    pub end_year: u32,
    pub sex_ratio_at_birth: f64,
    pub population: Vec<PopulationRow>,
    pub mortality: Vec<MortalityRow>,
    pub fertility: Vec<FertilityRow>,
    #[serde(default)]
    pub migration: Option<Vec<MigrationRow>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectionYearResult {
    pub year: u32,
    pub total_population: i64,
    pub births: i64,
    pub deaths: i64,
    pub net_migration: i64,
    pub natural_change: i64,
    pub growth_rate: f64,
}

/// Population snapshot by age and sex
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CohortSnapshot {
    pub age: u32,
    pub male: i64,
    pub female: i64,
}

/// Full population data for a single year
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct YearPopulationSnapshot {
    pub year: u32,
    pub cohorts: Vec<CohortSnapshot>,
    pub total_male: i64,
    pub total_female: i64,
    pub total: i64,
}

/// Statistics about the input data received
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InputDataStats {
    pub population_rows: usize,
    pub mortality_rows: usize,
    pub fertility_rows: usize,
    pub migration_rows: usize,
    pub total_initial_population: i64,
    pub male_population: i64,
    pub female_population: i64,
    pub base_year: u32,
    pub end_year: u32,
    pub years_projected: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectionRunResponse {
    pub workspace_id: String,
    pub success: bool,
    pub years: Vec<ProjectionYearResult>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub processing_time_ms: u64,
    /// Detailed stats about input data
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_stats: Option<InputDataStats>,
    /// Full population snapshots by year (age/sex breakdown)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub population_by_year: Option<Vec<YearPopulationSnapshot>>,
}

/// Message envelope (matches TypeScript definition)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageEnvelope<T> {
    pub id: String,
    pub timestamp: String,
    #[serde(rename = "correlationId")]
    pub correlation_id: String,
    pub payload: T,
}

impl<T> MessageEnvelope<T> {
    pub fn new(payload: T, correlation_id: Option<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now().to_rfc3339(),
            correlation_id: correlation_id.unwrap_or_else(|| Uuid::new_v4().to_string()),
            payload,
        }
    }
}

// ============================================================
// Projection Engine Runner
// ============================================================

/// Capture current population state as a snapshot
fn capture_population_snapshot(ccm: &CohortComponentModel, year: u32) -> YearPopulationSnapshot {
    use std::collections::HashMap;
    
    let cohorts = ccm.get_cohorts();
    
    // Aggregate by age (combining genders into single row)
    let mut by_age: HashMap<u32, (i64, i64)> = HashMap::new();
    
    for cohort in &cohorts {
        let entry = by_age.entry(cohort.age).or_insert((0, 0));
        match cohort.gender {
            Gender::Male => entry.0 += cohort.count.round() as i64,
            Gender::Female => entry.1 += cohort.count.round() as i64,
        }
    }
    
    // Convert to sorted vector of CohortSnapshot
    let mut snapshots: Vec<CohortSnapshot> = by_age
        .into_iter()
        .map(|(age, (male, female))| CohortSnapshot { age, male, female })
        .collect();
    snapshots.sort_by_key(|s| s.age);
    
    // Calculate totals
    let total_male: i64 = snapshots.iter().map(|s| s.male).sum();
    let total_female: i64 = snapshots.iter().map(|s| s.female).sum();
    
    YearPopulationSnapshot {
        year,
        cohorts: snapshots,
        total_male,
        total_female,
        total: total_male + total_female,
    }
}

/// Run a projection using the CCM engine
pub fn run_projection(request: &ProjectionRunRequest) -> Result<ProjectionRunResponse, String> {
    let start = Instant::now();
    
    // Validate input
    if request.population.is_empty() {
        return Err("Population data is required".to_string());
    }
    if request.mortality.is_empty() {
        return Err("Mortality data is required".to_string());
    }
    if request.fertility.is_empty() {
        return Err("Fertility data is required".to_string());
    }
    if request.base_year >= request.end_year {
        return Err("End year must be greater than base year".to_string());
    }
    
    // Create CCM model
    let mut ccm = CohortComponentModel::new();
    
    // Use a region ID for this workspace
    let region_id = "DEFAULT";
    
    // Calculate input statistics
    let male_pop: f64 = request.population.iter().map(|r| r.male).sum();
    let female_pop: f64 = request.population.iter().map(|r| r.female).sum();
    let total_initial_pop = male_pop + female_pop;
    let migration_rows = request.migration.as_ref().map(|m| m.len()).unwrap_or(0);
    
    info!(
        "📊 Received data: {} population rows, {} mortality rows, {} fertility rows, {} migration rows",
        request.population.len(),
        request.mortality.len(),
        request.fertility.len(),
        migration_rows
    );
    info!(
        "📊 Input population: {} total ({} male, {} female)",
        total_initial_pop.round() as i64,
        male_pop.round() as i64,
        female_pop.round() as i64
    );
    
    // Load population data
    let cohorts: Vec<Cohort> = request.population.iter().flat_map(|row| {
        vec![
            Cohort {
                age: row.age,
                gender: Gender::Male,
                region_id: region_id.to_string(),
                count: row.male,
            },
            Cohort {
                age: row.age,
                gender: Gender::Female,
                region_id: region_id.to_string(),
                count: row.female,
            },
        ]
    }).collect();
    
    ccm.load_population(&cohorts);
    
    // Debug: Log loaded population stats
    let loaded_pop = ccm.total_population();
    info!(
        "📊 Loaded population: {} people from {} cohorts (expected ~10.2M for Humania)",
        loaded_pop.round() as i64,
        cohorts.len()
    );
    
    // Load mortality table
    let mortality_rates: Vec<MortalityRate> = request.mortality.iter().map(|row| {
        MortalityRate {
            age: row.age,
            male: row.male,
            female: row.female,
        }
    }).collect();
    
    ccm.load_mortality_table(MortalityTable {
        region_id: region_id.to_string(),
        year: request.base_year,
        rates: mortality_rates,
    });
    
    // Load fertility table
    let fertility_rates: Vec<FertilityRate> = request.fertility.iter().map(|row| {
        FertilityRate {
            age: row.age,
            rate: row.rate,
        }
    }).collect();
    
    ccm.load_fertility_table(FertilityTable {
        region_id: region_id.to_string(),
        year: request.base_year,
        rates: fertility_rates,
        sex_ratio_at_birth: request.sex_ratio_at_birth,
    });
    
    // Load migration table (optional)
    if let Some(migration) = &request.migration {
        if !migration.is_empty() {
            let migration_rates: Vec<MigrationRate> = migration.iter().map(|row| {
                MigrationRate {
                    age: row.age,
                    male: row.male,
                    female: row.female,
                }
            }).collect();
            
            ccm.load_migration_table(MigrationTable {
                region_id: region_id.to_string(),
                year: request.base_year,
                rates: migration_rates,
            });
        }
    }
    
    // Run projection year by year
    let regions = vec![region_id.to_string()];
    let mut results = Vec::new();
    let mut population_snapshots = Vec::new();
    
    // Capture initial population (base year, before any projection)
    population_snapshots.push(capture_population_snapshot(&ccm, request.base_year));
    
    for year in request.base_year..=request.end_year {
        let year_result = ccm.project_one_year(year, &regions);
        
        results.push(ProjectionYearResult {
            year,
            total_population: year_result.total_population.round() as i64,
            births: year_result.births.round() as i64,
            deaths: year_result.deaths.round() as i64,
            net_migration: year_result.net_migration.round() as i64,
            natural_change: year_result.natural_change.round() as i64,
            growth_rate: year_result.growth_rate,
        });
        
        // Capture population snapshot after this year's projection
        // The snapshot represents population at the END of this year
        population_snapshots.push(capture_population_snapshot(&ccm, year + 1));
    }
    
    let processing_time = start.elapsed().as_millis() as u64;
    
    // Build input statistics
    let input_stats = InputDataStats {
        population_rows: request.population.len(),
        mortality_rows: request.mortality.len(),
        fertility_rows: request.fertility.len(),
        migration_rows,
        total_initial_population: total_initial_pop.round() as i64,
        male_population: male_pop.round() as i64,
        female_population: female_pop.round() as i64,
        base_year: request.base_year,
        end_year: request.end_year,
        years_projected: request.end_year - request.base_year + 1,
    };
    
    info!(
        "📊 Projection complete: {} years in {}ms, final pop = {}",
        input_stats.years_projected,
        processing_time,
        results.last().map(|r| r.total_population).unwrap_or(0)
    );
    
    Ok(ProjectionRunResponse {
        workspace_id: request.workspace_id.clone(),
        success: true,
        years: results,
        error: None,
        processing_time_ms: processing_time,
        input_stats: Some(input_stats),
        population_by_year: Some(population_snapshots),
    })
}

// ============================================================
// NATS Handler
// ============================================================

/// Projection handler that subscribes to projection requests
pub struct ProjectionHandler {
    client: Client,
}

impl ProjectionHandler {
    pub fn new(client: Client) -> Self {
        Self { client }
    }

    /// Start listening for projection requests
    pub async fn start(self) -> Result<()> {
        let mut subscriber = self.client.subscribe(SUBJECT_PROJECTION_RUN).await?;
        
        info!("📊 Subscribed to {}", SUBJECT_PROJECTION_RUN);

        while let Some(message) = subscriber.next().await {
            let payload = String::from_utf8_lossy(&message.payload);
            
            match serde_json::from_str::<MessageEnvelope<ProjectionRunRequest>>(&payload) {
                Ok(envelope) => {
                    info!(
                        "📊 Received projection request for workspace: {} ({}-{})",
                        envelope.payload.workspace_id,
                        envelope.payload.base_year,
                        envelope.payload.end_year
                    );
                    
                    let response = match run_projection(&envelope.payload) {
                        Ok(result) => {
                            info!(
                                "✅ Projection completed: {} years in {}ms",
                                result.years.len(),
                                result.processing_time_ms
                            );
                            result
                        }
                        Err(err) => {
                            error!("❌ Projection failed: {}", err);
                            ProjectionRunResponse {
                                workspace_id: envelope.payload.workspace_id.clone(),
                                success: false,
                                years: vec![],
                                error: Some(err),
                                processing_time_ms: 0,
                                input_stats: None,
                                population_by_year: None,
                            }
                        }
                    };
                    
                    let response_envelope = MessageEnvelope::new(
                        response,
                        Some(envelope.correlation_id),
                    );
                    
                    if let Some(reply_to) = message.reply {
                        let response_json = serde_json::to_string(&response_envelope)?;
                        self.client.publish(reply_to, response_json.into()).await?;
                        info!("📊 Sent projection response");
                    }
                }
                Err(e) => {
                    error!("Failed to parse projection request: {}", e);
                    
                    // Send error response
                    if let Some(reply_to) = message.reply {
                        let error_response = ProjectionRunResponse {
                            workspace_id: "unknown".to_string(),
                            success: false,
                            years: vec![],
                            error: Some(format!("Failed to parse request: {}", e)),
                            processing_time_ms: 0,
                            input_stats: None,
                            population_by_year: None,
                        };
                        let error_envelope = MessageEnvelope::new(error_response, None);
                        let response_json = serde_json::to_string(&error_envelope)?;
                        self.client.publish(reply_to, response_json.into()).await?;
                    }
                }
            }
        }

        Ok(())
    }
}

// ============================================================
// Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_request() -> ProjectionRunRequest {
        ProjectionRunRequest {
            workspace_id: "test-ws-1".to_string(),
            base_year: 2024,
            end_year: 2026,
            sex_ratio_at_birth: 105.0,
            population: vec![
                PopulationRow { age: 0, male: 1000.0, female: 950.0 },
                PopulationRow { age: 1, male: 1000.0, female: 950.0 },
                PopulationRow { age: 30, male: 2000.0, female: 2000.0 },
            ],
            mortality: vec![
                MortalityRow { age: 0, male: 0.01, female: 0.008 },
                MortalityRow { age: 1, male: 0.001, female: 0.0008 },
                MortalityRow { age: 30, male: 0.002, female: 0.001 },
            ],
            fertility: vec![
                FertilityRow { age: 30, rate: 0.1 },
            ],
            migration: None,
        }
    }

    #[test]
    fn test_run_projection_basic() {
        let request = sample_request();
        let result = run_projection(&request).unwrap();
        
        assert!(result.success);
        assert_eq!(result.workspace_id, "test-ws-1");
        assert_eq!(result.years.len(), 3); // 2024, 2025, 2026
    }

    #[test]
    fn test_run_projection_has_births() {
        let request = sample_request();
        let result = run_projection(&request).unwrap();
        
        // Should have births from 30yo women
        let year_2024 = &result.years[0];
        assert!(year_2024.births > 0, "Expected births, got {}", year_2024.births);
    }

    #[test]
    fn test_run_projection_has_deaths() {
        let request = sample_request();
        let result = run_projection(&request).unwrap();
        
        // Should have deaths
        let year_2024 = &result.years[0];
        assert!(year_2024.deaths > 0, "Expected deaths, got {}", year_2024.deaths);
    }

    #[test]
    fn test_run_projection_with_migration() {
        let mut request = sample_request();
        request.migration = Some(vec![
            MigrationRow { age: 30, male: 100.0, female: 100.0 },
        ]);
        
        let result = run_projection(&request).unwrap();
        
        assert!(result.success);
        let year_2024 = &result.years[0];
        assert_eq!(year_2024.net_migration, 200);
    }

    #[test]
    fn test_run_projection_error_empty_population() {
        let mut request = sample_request();
        request.population = vec![];
        
        let result = run_projection(&request);
        
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Population"));
    }

    #[test]
    fn test_run_projection_error_invalid_year_range() {
        let mut request = sample_request();
        request.end_year = request.base_year;
        
        let result = run_projection(&request);
        
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("End year"));
    }

    #[test]
    fn test_projection_processing_time() {
        let request = sample_request();
        let result = run_projection(&request).unwrap();
        
        // Should record processing time
        assert!(result.processing_time_ms >= 0);
    }

    #[test]
    fn test_message_envelope_serialization() {
        let request = sample_request();
        let envelope = MessageEnvelope::new(request, Some("corr-123".to_string()));
        
        let json = serde_json::to_string(&envelope).unwrap();
        
        assert!(json.contains("correlationId"));
        assert!(json.contains("corr-123"));
        assert!(json.contains("test-ws-1"));
    }
}

