//! Message types for NATS communication

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;

use super::{Scenario, ProjectionResult, ProjectionYear};

/// Base message envelope
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message<T> {
    pub id: String,
    pub timestamp: String,
    pub correlation_id: String,
    pub payload: T,
}

impl<T> Message<T> {
    pub fn new(payload: T, correlation_id: Option<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now().to_rfc3339(),
            correlation_id: correlation_id.unwrap_or_else(|| Uuid::new_v4().to_string()),
            payload,
        }
    }
}

/// Error payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorPayload {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

pub type ErrorMessage = Message<ErrorPayload>;

impl ErrorMessage {
    pub fn from_error(code: &str, message: &str, correlation_id: &str) -> Self {
        Message::new(
            ErrorPayload {
                code: code.to_string(),
                message: message.to_string(),
                details: None,
            },
            Some(correlation_id.to_string()),
        )
    }
}

// ============================================================
// SCENARIO MESSAGES
// ============================================================

/// Subject: popula.scenario.submit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioSubmitPayload {
    pub scenario: Scenario,
}

/// Subject: popula.scenario.{id}.accepted
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioAcceptedPayload {
    pub scenario_id: String,
    pub estimated_duration_ms: u64,
    pub total_years: u32,
}

/// Subject: popula.scenario.{id}.rejected
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioRejectedPayload {
    pub scenario_id: String,
    pub reason: String,
    pub validation_errors: Vec<String>,
}

// ============================================================
// PROJECTION MESSAGES
// ============================================================

/// Subject: popula.projection.{id}.progress
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectionProgressPayload {
    pub scenario_id: String,
    pub current_year: u32,
    pub total_years: u32,
    pub percent_complete: f64,
    pub latest_year: ProjectionYear,
}

/// Subject: popula.projection.{id}.result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectionResultPayload {
    pub scenario_id: String,
    pub result: ProjectionResult,
}

/// Subject: popula.projection.{id}.error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectionErrorPayload {
    pub scenario_id: String,
    pub year: u32,
    pub error: ErrorPayload,
}

// ============================================================
// NATS SUBJECTS
// ============================================================

pub mod subjects {
    pub const SCENARIO_SUBMIT: &str = "popula.scenario.submit";
    
    pub fn scenario_accepted(id: &str) -> String {
        format!("popula.scenario.{}.accepted", id)
    }
    
    pub fn scenario_rejected(id: &str) -> String {
        format!("popula.scenario.{}.rejected", id)
    }
    
    pub fn projection_progress(id: &str) -> String {
        format!("popula.projection.{}.progress", id)
    }
    
    pub fn projection_result(id: &str) -> String {
        format!("popula.projection.{}.result", id)
    }
    
    pub fn projection_error(id: &str) -> String {
        format!("popula.projection.{}.error", id)
    }
}

