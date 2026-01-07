//! Scenario types for demographic projections

use serde::{Deserialize, Serialize};
use super::Shock;

/// Scenario: User-defined projection parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scenario {
    pub id: String,
    pub name: String,
    pub description: String,
    pub base_year: u32,
    pub end_year: u32,
    pub regions: Vec<String>,
    pub shocks: Vec<Shock>,
    pub created_at: String,
    pub updated_at: String,
}

impl Scenario {
    /// Validate scenario parameters
    pub fn validate(&self) -> ScenarioValidationResult {
        let mut errors = Vec::new();

        if self.id.trim().is_empty() {
            errors.push("Scenario ID is required".to_string());
        }

        if self.name.trim().is_empty() {
            errors.push("Scenario name is required".to_string());
        }

        if self.base_year >= self.end_year {
            errors.push("Base year must be before end year".to_string());
        }

        if self.base_year < 1950 || self.base_year > 2100 {
            errors.push("Base year must be between 1950 and 2100".to_string());
        }

        if self.end_year < 1950 || self.end_year > 2200 {
            errors.push("End year must be between 1950 and 2200".to_string());
        }

        if self.regions.is_empty() {
            errors.push("At least one region is required".to_string());
        }

        // Validate shocks
        for shock in &self.shocks {
            if shock.start_year < self.base_year {
                errors.push(format!("Shock '{}' starts before scenario base year", shock.name));
            }
            if shock.end_year > self.end_year {
                errors.push(format!("Shock '{}' ends after scenario end year", shock.name));
            }
        }

        ScenarioValidationResult {
            valid: errors.is_empty(),
            errors,
        }
    }

    /// Get the number of years to project
    pub fn projection_years(&self) -> u32 {
        self.end_year - self.base_year
    }
}

/// Result of scenario validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_scenario() -> Scenario {
        Scenario {
            id: "test-1".to_string(),
            name: "Test Scenario".to_string(),
            description: "A test scenario".to_string(),
            base_year: 2024,
            end_year: 2050,
            regions: vec!["CZ".to_string()],
            shocks: vec![],
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn test_valid_scenario() {
        let scenario = create_test_scenario();
        let result = scenario.validate();
        assert!(result.valid);
        assert!(result.errors.is_empty());
    }

    #[test]
    fn test_invalid_year_range() {
        let mut scenario = create_test_scenario();
        scenario.base_year = 2050;
        scenario.end_year = 2024;
        
        let result = scenario.validate();
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("Base year must be before")));
    }

    #[test]
    fn test_projection_years() {
        let scenario = create_test_scenario();
        assert_eq!(scenario.projection_years(), 26);
    }
}

