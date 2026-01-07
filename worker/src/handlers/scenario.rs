//! Scenario message handler.
//!
//! Handles scenario submission and projection execution.
//! TODO: Implement full projection functionality

use async_nats::Client;
use serde::{Deserialize, Serialize};
use tracing::{info, warn};
use uuid::Uuid;
use chrono::Utc;
use anyhow::Result;
use futures::StreamExt;

use crate::storage::Storage;

/// NATS subjects
const SUBJECT_SCENARIO_SUBMIT: &str = "popula.scenario.submit";
const SUBJECT_SCENARIO_ACCEPTED: &str = "popula.scenario.accepted";

/// Message envelope
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageEnvelope<T> {
    pub id: String,
    pub timestamp: String,
    #[serde(rename = "correlationId")]
    pub correlation_id: String,
    pub payload: T,
}

/// Create scenario request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateScenarioRequest {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub base_year: u32,
    pub end_year: u32,
    pub regions: Vec<String>,
    #[serde(default)]
    pub shocks: Vec<crate::engine::Shock>,
}

/// Scenario response (simplified for now)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioResponse {
    pub id: String,
    pub name: String,
    pub description: String,
    pub base_year: u32,
    pub end_year: u32,
    pub regions: Vec<String>,
    pub created_at: String,
}

/// Scenario accepted response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioAcceptedResponse {
    pub scenario: ScenarioResponse,
    pub estimated_duration_ms: u64,
}

/// Scenario handler
pub struct ScenarioHandler {
    client: Client,
    #[allow(dead_code)]
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
        
        info!("📋 Subscribed to {}", SUBJECT_SCENARIO_SUBMIT);

        while let Some(message) = subscriber.next().await {
            let payload = String::from_utf8_lossy(&message.payload);
            
            match serde_json::from_str::<MessageEnvelope<CreateScenarioRequest>>(&payload) {
                Ok(envelope) => {
                    info!("📋 Received scenario submission: {}", envelope.payload.name);
                    
                    if let Err(e) = self.handle_scenario_submit(envelope).await {
                        tracing::error!("Failed to handle scenario: {}", e);
                    }
                }
                Err(e) => {
                    warn!("Failed to parse scenario message: {}", e);
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

        // Create scenario response
        let scenario = ScenarioResponse {
            id: Uuid::new_v4().to_string(),
            name: request.name.clone(),
            description: request.description.unwrap_or_default(),
            base_year: request.base_year,
            end_year: request.end_year,
            regions: request.regions,
            created_at: now,
        };

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
        
        info!("✅ Published scenario accepted: {}", scenario.id);

        // TODO: Start projection in background
        // For now, just log that it would run
        info!("📊 Would start projection for scenario: {} (not implemented yet)", scenario.id);

        Ok(())
    }
}
