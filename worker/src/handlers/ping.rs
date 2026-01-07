//! Ping handler for demo/health check functionality.
//!
//! Responds to ping requests with a greeting from the Rust worker.

use async_nats::Client;
use serde::{Deserialize, Serialize};
use tracing::info;
use anyhow::Result;
use chrono::Utc;
use uuid::Uuid;
use futures::StreamExt;

/// NATS subjects for ping
pub const SUBJECT_PING: &str = "popula.ping";

/// Ping request payload
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PingRequest {
    pub message: String,
}

/// Ping response payload
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PingResponse {
    pub original_message: String,
    pub reply: String,
    pub worker_version: String,
    pub processed_at: String,
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

/// Create a ping response from a request
pub fn create_ping_response(request: &PingRequest) -> PingResponse {
    PingResponse {
        original_message: request.message.clone(),
        reply: format!("Hello from Rust! You said: '{}'", request.message),
        worker_version: env!("CARGO_PKG_VERSION").to_string(),
        processed_at: Utc::now().to_rfc3339(),
    }
}

/// Ping handler that subscribes to ping requests
pub struct PingHandler {
    client: Client,
}

impl PingHandler {
    pub fn new(client: Client) -> Self {
        Self { client }
    }

    /// Start listening for ping messages
    pub async fn start(self) -> Result<()> {
        let mut subscriber = self.client.subscribe(SUBJECT_PING).await?;
        
        info!("📡 Subscribed to {}", SUBJECT_PING);

        while let Some(message) = subscriber.next().await {
            let payload = String::from_utf8_lossy(&message.payload);
            
            match serde_json::from_str::<MessageEnvelope<PingRequest>>(&payload) {
                Ok(envelope) => {
                    info!("🏓 Received ping: {}", envelope.payload.message);
                    
                    let response = create_ping_response(&envelope.payload);
                    let response_envelope = MessageEnvelope::new(
                        response,
                        Some(envelope.correlation_id),
                    );
                    
                    if let Some(reply_to) = message.reply {
                        let response_json = serde_json::to_string(&response_envelope)?;
                        self.client.publish(reply_to, response_json.into()).await?;
                        info!("🏓 Sent pong response");
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to parse ping message: {}", e);
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_ping_response_contains_original_message() {
        let request = PingRequest {
            message: "Hello from TypeScript!".to_string(),
        };
        
        let response = create_ping_response(&request);
        
        assert_eq!(response.original_message, "Hello from TypeScript!");
    }

    #[test]
    fn test_create_ping_response_has_greeting() {
        let request = PingRequest {
            message: "Test".to_string(),
        };
        
        let response = create_ping_response(&request);
        
        assert!(response.reply.contains("Hello from Rust!"));
        assert!(response.reply.contains("Test"));
    }

    #[test]
    fn test_create_ping_response_includes_version() {
        let request = PingRequest {
            message: "Version check".to_string(),
        };
        
        let response = create_ping_response(&request);
        
        assert_eq!(response.worker_version, env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn test_create_ping_response_has_timestamp() {
        let request = PingRequest {
            message: "Timestamp check".to_string(),
        };
        
        let response = create_ping_response(&request);
        
        // Should be a valid ISO 8601 timestamp
        assert!(response.processed_at.contains("T"));
        assert!(response.processed_at.len() > 10);
    }

    #[test]
    fn test_message_envelope_serialization() {
        let payload = PingRequest {
            message: "Test".to_string(),
        };
        let envelope = MessageEnvelope::new(payload, Some("corr-123".to_string()));
        
        let json = serde_json::to_string(&envelope).unwrap();
        
        assert!(json.contains("correlationId"));
        assert!(json.contains("corr-123"));
        assert!(json.contains("Test"));
    }

    #[test]
    fn test_message_envelope_deserialization() {
        let json = r#"{
            "id": "msg-1",
            "timestamp": "2026-01-07T12:00:00Z",
            "correlationId": "corr-1",
            "payload": { "message": "Hello" }
        }"#;
        
        let envelope: MessageEnvelope<PingRequest> = serde_json::from_str(json).unwrap();
        
        assert_eq!(envelope.id, "msg-1");
        assert_eq!(envelope.correlation_id, "corr-1");
        assert_eq!(envelope.payload.message, "Hello");
    }

    #[test]
    fn test_ping_response_serialization_roundtrip() {
        let request = PingRequest {
            message: "Round trip test".to_string(),
        };
        let response = create_ping_response(&request);
        
        let json = serde_json::to_string(&response).unwrap();
        let deserialized: PingResponse = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.original_message, response.original_message);
        assert_eq!(deserialized.reply, response.reply);
        assert_eq!(deserialized.worker_version, response.worker_version);
    }
}
