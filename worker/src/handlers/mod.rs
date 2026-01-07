//! Message handlers module.
//!
//! Handles incoming NATS messages and orchestrates the demographic engine.

mod ping;
mod scenario;

pub use ping::{PingHandler, PingRequest, PingResponse, SUBJECT_PING};
pub use scenario::ScenarioHandler;

use async_nats::Client;
use anyhow::Result;
use tracing::info;

use crate::storage::Storage;

/// Start all message handlers
pub async fn start_handlers(client: Client, storage: Box<dyn Storage>) -> Result<()> {
    info!("🚀 Starting message handlers...");
    
    // Start ping handler (for demo/health check)
    let ping_handler = PingHandler::new(client.clone());
    tokio::spawn(async move {
        if let Err(e) = ping_handler.start().await {
            tracing::error!("Ping handler error: {}", e);
        }
    });
    
    // Start scenario handler
    let scenario_handler = ScenarioHandler::new(client.clone(), storage);
    tokio::spawn(async move {
        if let Err(e) = scenario_handler.start().await {
            tracing::error!("Scenario handler error: {}", e);
        }
    });
    
    info!("✅ All handlers started");
    
    Ok(())
}
