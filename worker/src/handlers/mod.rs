//! Message handlers module.
//!
//! Handles incoming NATS messages and orchestrates the demographic engine.

mod scenario;

pub use scenario::ScenarioHandler;
