//! Popula Worker - Demographic Modeling Engine
//!
//! This worker subscribes to NATS messages, processes demographic
//! projections using the Cohort-Component Method (CCM), and
//! publishes results back.

mod engine;
mod handlers;
mod storage;

use anyhow::Result;
use tracing::{info, error, Level};
use tracing_subscriber::FmtSubscriber;

/// NATS connection URL (WebSocket for browser compatibility)
const NATS_URL: &str = "nats://localhost:4222";

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .with_target(false)
        .pretty()
        .init();
    
    info!("🚀 Popula Worker starting...");
    info!("   Version: {}", env!("CARGO_PKG_VERSION"));
    
    // Initialize storage (in-memory for MVP)
    let storage = storage::create_storage(&storage::StorageConfig::Memory).await?;
    storage.initialize().await?;
    info!("💾 Storage initialized (backend: {})", storage.get_backend_name());
    
    // Connect to NATS
    info!("📡 Connecting to NATS at {}...", NATS_URL);
    let client = match async_nats::connect(NATS_URL).await {
        Ok(client) => {
            info!("✅ Connected to NATS");
            client
        }
        Err(e) => {
            error!("❌ Failed to connect to NATS: {}", e);
            error!("   Make sure NATS server is running: nats-server");
            return Err(e.into());
        }
    };
    
    // Start message handlers
    info!("📨 Starting message handlers...");
    handlers::start_handlers(client.clone(), storage).await?;
    
    info!("✨ Popula Worker ready!");
    info!("   Listening for messages on popula.*");
    
    // Keep the worker running
    tokio::signal::ctrl_c().await?;
    info!("👋 Shutting down...");
    
    Ok(())
}
