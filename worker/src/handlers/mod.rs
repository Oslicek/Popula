//! Message handlers module.
//!
//! Handles incoming NATS messages and orchestrates the demographic engine.

mod ping;
mod scenario;
mod projection_handler;
mod geo_handler;

pub use ping::{PingHandler, PingRequest, PingResponse, SUBJECT_PING};
pub use scenario::ScenarioHandler;
pub use projection_handler::{ProjectionHandler, SUBJECT_PROJECTION_RUN};
pub use geo_handler::handle_geo_processing;

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
    
    // Start projection handler
    let projection_handler = ProjectionHandler::new(client.clone());
    tokio::spawn(async move {
        if let Err(e) = projection_handler.start().await {
            tracing::error!("Projection handler error: {}", e);
        }
    });
    
    // Start geo processing handler
    let geo_client = client.clone();
    tokio::spawn(async move {
        handle_geo_processing(geo_client).await;
    });
    
    info!("✅ All handlers started");
    
    Ok(())
}
