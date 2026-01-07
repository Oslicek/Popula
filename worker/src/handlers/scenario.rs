//! Scenario message handler.
//!
//! Handles scenario submission and projection execution.

use async_nats::Client;
use serde::{Deserialize, Serialize};
use tracing::{info, error, warn};
use uuid::Uuid;
use chrono::Utc;
use anyhow::Result;

use crate::engine::{DemographicEngine, Scenario, ScenarioStatus, ProjectionProgress};
use crate::storage::Storage;

/// NATS subjects
const SUBJECT_SCENARIO_SUBMIT: &str = "popula.scenario.submit";
const SUBJECT_SCENARIO_ACCEPTED: &str = "popula.scenario.accepted";

/// Message envelope
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageEnvelope<T> {
    pub id: String,
    pub timestamp: String,
    pub correlation_id: String,
    pub payload: T,
}

/// Create scenario request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateScenarioRequest {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub base_year: u32,
    pub end_year: u32,
    pub regions: Vec<String>,
    #[serde(default)]
    pub shocks: Vec<crate::engine::Shock>,
}

/// Scenario accepted response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioAcceptedResponse {
    pub scenario: Scenario,
    pub estimated_duration_ms: u64,
}

/// Scenario handler
pub struct ScenarioHandler {
    client: Client,
    storage: Box<dyn Storage>,
}

impl ScenarioHandler {
    /// Create a new scenario handler
    pub fn new(client: Client, storage: Box<dyn Storage>) -> Self {
        Self { client, storage }
    }

    /// Start listening for messages
    pub async fn start(self) -> Result<()> {
        let mut subscriber = self.client.subscribe(SUBJECT_SCENARIO_SUBMIT).await?;
        
        info!("Subscribed to {}", SUBJECT_SCENARIO_SUBMIT);

        while let Some(message) = subscriber.next().await {
            let payload = String::from_utf8_lossy(&message.payload);
            
            match serde_json::from_str::<MessageEnvelope<CreateScenarioRequest>>(&payload) {
                Ok(envelope) => {
                    info!("Received scenario submission: {}", envelope.payload.name);
                    
                    if let Err(e) = self.handle_scenario_submit(envelope).await {
                        error!("Failed to handle scenario: {}", e);
                    }
                }
                Err(e) => {
                    warn!("Failed to parse message: {}", e);
                }
            }
        }

        Ok(())
    }

    /// Handle scenario submission
    async fn handle_scenario_submit(
        &self,
        envelope: MessageEnvelope<CreateScenarioRequest>,
    ) -> Result<()> {
        let request = envelope.payload;
        let now = Utc::now().to_rfc3339();

        // Create scenario
        let scenario = Scenario {
            id: Uuid::new_v4().to_string(),
            name: request.name,
            description: request.description,
            base_year: request.base_year,
            end_year: request.end_year,
            regions: request.regions,
            shocks: request.shocks,
            status: ScenarioStatus::Submitted,
            created_at: now.clone(),
            updated_at: now,
        };

        // Save to storage
        self.storage.scenarios().save(&scenario).await?;
        info!("Saved scenario: {}", scenario.id);

        // Estimate duration (rough: 10ms per year)
        let years = scenario.end_year.saturating_sub(scenario.base_year);
        let estimated_duration_ms = (years as u64) * 10;

        // Send accepted response
        let response = MessageEnvelope {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now().to_rfc3339(),
            correlation_id: envelope.correlation_id,
            payload: ScenarioAcceptedResponse {
                scenario: scenario.clone(),
                estimated_duration_ms,
            },
        };

        let response_json = serde_json::to_string(&response)?;
        self.client
            .publish(SUBJECT_SCENARIO_ACCEPTED, response_json.into())
            .await?;
        
        info!("Published scenario accepted: {}", scenario.id);

        // Start projection in background
        let scenario_id = scenario.id.clone();
        let client = self.client.clone();
        
        tokio::spawn(async move {
            if let Err(e) = Self::run_projection(scenario, client).await {
                error!("Projection failed for {}: {}", scenario_id, e);
            }
        });

        Ok(())
    }

    /// Run the demographic projection
    async fn run_projection(scenario: Scenario, client: Client) -> Result<()> {
        info!("Starting projection for scenario: {}", scenario.id);

        let mut engine = DemographicEngine::new();

        // TODO: Load initial population from storage/data
        // For now, we'll use empty population (no results)

        // Add shocks
        for shock in &scenario.shocks {
            engine.add_shock(shock.clone());
        }

        // Run projection with progress updates
        let scenario_id = scenario.id.clone();
        let client_clone = client.clone();
        
        let result = engine.run_projection(&scenario, |progress| {
            // Publish progress update
            let progress_subject = format!("popula.projection.{}.progress", scenario_id);
            let progress_msg = MessageEnvelope {
                id: Uuid::new_v4().to_string(),
                timestamp: Utc::now().to_rfc3339(),
                correlation_id: scenario_id.clone(),
                payload: progress,
            };

            if let Ok(json) = serde_json::to_string(&progress_msg) {
                // Fire and forget - we're in a sync callback
                let _ = client_clone.try_publish(progress_subject, json.into());
            }
        });

        // Publish final result
        let result_subject = format!("popula.projection.{}.result", scenario.id);
        let result_msg = MessageEnvelope {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now().to_rfc3339(),
            correlation_id: scenario.id.clone(),
            payload: result,
        };

        let result_json = serde_json::to_string(&result_msg)?;
        client.publish(result_subject, result_json.into()).await?;

        info!("Projection completed for scenario: {}", scenario.id);

        Ok(())
    }
}
