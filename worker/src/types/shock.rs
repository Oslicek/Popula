//! Shock types for demographic rate modifiers

use serde::{Deserialize, Serialize};
use super::{AgeGroup, Gender};

/// Type of demographic shock
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ShockType {
    Mortality,
    Fertility,
    Migration,
}

/// Target specification for shocks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Target<T> {
    All,
    Specific(Vec<T>),
}

impl<T> Target<T> {
    pub fn is_all(&self) -> bool {
        matches!(self, Target::All)
    }
}

/// Age target for shocks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum AgeTarget {
    #[serde(rename = "all")]
    All,
    Range(AgeGroup),
}

impl AgeTarget {
    pub fn contains(&self, age: u32) -> bool {
        match self {
            AgeTarget::All => true,
            AgeTarget::Range(group) => group.contains(age),
        }
    }
}

/// Shock modifier types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ShockModifier {
    /// Multiply the base value (1.5 = 50% increase)
    Multiplier { value: f64 },
    /// Add an absolute value
    Absolute { value: f64 },
    /// Custom function (evaluated at runtime)
    Function { expression: String },
}

impl ShockModifier {
    pub fn multiplier(value: f64) -> Self {
        Self::Multiplier { value }
    }

    pub fn absolute(value: f64) -> Self {
        Self::Absolute { value }
    }

    /// Apply the modifier to a base value
    pub fn apply(&self, base_value: f64) -> f64 {
        match self {
            ShockModifier::Multiplier { value } => base_value * value,
            ShockModifier::Absolute { value } => base_value + value,
            ShockModifier::Function { .. } => {
                // Function modifiers would require an expression evaluator
                // For now, just return the base value
                base_value
            }
        }
    }
}

/// Shock: Modifier applied to demographic rates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Shock {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "type")]
    pub shock_type: ShockType,
    pub start_year: u32,
    pub end_year: u32,
    pub target_regions: Target<String>,
    pub target_genders: Target<Gender>,
    pub target_ages: AgeTarget,
    pub modifier: ShockModifier,
}

impl Shock {
    /// Check if the shock applies to the given parameters
    pub fn applies(
        &self,
        year: u32,
        age: u32,
        gender: Gender,
        region_id: &str,
    ) -> bool {
        // Check year range
        if year < self.start_year || year > self.end_year {
            return false;
        }

        // Check region
        if let Target::Specific(regions) = &self.target_regions {
            if !regions.iter().any(|r| r == region_id) {
                return false;
            }
        }

        // Check gender
        if let Target::Specific(genders) = &self.target_genders {
            if !genders.contains(&gender) {
                return false;
            }
        }

        // Check age
        if !self.target_ages.contains(age) {
            return false;
        }

        true
    }
}

/// Create a pandemic shock template
pub fn pandemic_shock(
    id: &str,
    name: &str,
    start_year: u32,
    end_year: u32,
    mortality_increase: f64,
    min_age: Option<u32>,
) -> Shock {
    Shock {
        id: id.to_string(),
        name: name.to_string(),
        description: format!(
            "Pandemic: {}% mortality increase for ages {}+",
            ((mortality_increase - 1.0) * 100.0).round(),
            min_age.unwrap_or(0)
        ),
        shock_type: ShockType::Mortality,
        start_year,
        end_year,
        target_regions: Target::All,
        target_genders: Target::All,
        target_ages: min_age
            .map(|min| AgeTarget::Range(AgeGroup::range(min, 120)))
            .unwrap_or(AgeTarget::All),
        modifier: ShockModifier::multiplier(mortality_increase),
    }
}

/// Create a war shock template
pub fn war_shock(
    id: &str,
    name: &str,
    start_year: u32,
    end_year: u32,
    mortality_increase: f64,
    min_age: Option<u32>,
    max_age: Option<u32>,
) -> Shock {
    let min = min_age.unwrap_or(18);
    let max = max_age.unwrap_or(45);
    
    Shock {
        id: id.to_string(),
        name: name.to_string(),
        description: format!(
            "War: {}% mortality increase for males {}-{}",
            ((mortality_increase - 1.0) * 100.0).round(),
            min,
            max
        ),
        shock_type: ShockType::Mortality,
        start_year,
        end_year,
        target_regions: Target::All,
        target_genders: Target::Specific(vec![Gender::Male]),
        target_ages: AgeTarget::Range(AgeGroup::range(min, max)),
        modifier: ShockModifier::multiplier(mortality_increase),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shock_modifier_multiplier() {
        let modifier = ShockModifier::multiplier(1.5);
        assert_eq!(modifier.apply(100.0), 150.0);
    }

    #[test]
    fn test_shock_modifier_absolute() {
        let modifier = ShockModifier::absolute(50.0);
        assert_eq!(modifier.apply(100.0), 150.0);
    }

    #[test]
    fn test_shock_applies() {
        let shock = pandemic_shock("test", "Test", 2025, 2026, 1.5, Some(65));
        
        // Should apply
        assert!(shock.applies(2025, 70, Gender::Male, "CZ"));
        assert!(shock.applies(2025, 70, Gender::Female, "CZ"));
        
        // Should not apply
        assert!(!shock.applies(2024, 70, Gender::Male, "CZ")); // Wrong year
        assert!(!shock.applies(2025, 50, Gender::Male, "CZ")); // Wrong age
    }

    #[test]
    fn test_war_shock_targets_males_only() {
        let shock = war_shock("war", "War", 2025, 2026, 3.0, None, None);
        
        assert!(shock.applies(2025, 30, Gender::Male, "CZ"));
        assert!(!shock.applies(2025, 30, Gender::Female, "CZ"));
    }
}

