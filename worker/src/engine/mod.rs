//! Demographic Engine Module
//!
//! Implements the Cohort-Component Method (CCM) for population projections.

mod types;
mod projection;
mod ccm;

#[cfg(test)]
mod ccm_tests;

pub use types::*;
pub use projection::DemographicEngine;
pub use ccm::CohortComponentModel;
