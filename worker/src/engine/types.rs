//! Core demographic types
//!
//! These types mirror the TypeScript definitions in @popula/shared-types

use serde::{Deserialize, Serialize};

/// Gender enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Gender {
    Male,
    Female,
}

/// Age group representation
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct AgeGroup {
    pub min: u32,
    pub max: u32,
}

impl AgeGroup {
    pub fn all() -> Self {
        Self { min: 0, max: 120 }
    }
    
    pub fn contains(&self, age: u32) -> bool {
        age >= self.min && age <= self.max
    }
}

/// Population cohort
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Cohort {
    pub age: u32,
    pub gender: Gender,
    pub region_id: String,
    pub count: f64,
}

/// Population metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PopulationMetadata {
    pub total_population: f64,
    pub median_age: f64,
    pub male_count: f64,
    pub female_count: f64,
}

/// Population at a point in time
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Population {
    pub scenario_id: String,
    pub year: u32,
    pub cohorts: Vec<Cohort>,
    pub metadata: PopulationMetadata,
}

impl Population {
    /// Calculate metadata from cohorts
    pub fn calculate_metadata(cohorts: &[Cohort]) -> PopulationMetadata {
        let total: f64 = cohorts.iter().map(|c| c.count).sum();
        let male_count: f64 = cohorts.iter()
            .filter(|c| c.gender == Gender::Male)
            .map(|c| c.count)
            .sum();
        let female_count = total - male_count;
        
        // Calculate median age (simplified)
        let mut cumulative = 0.0;
        let half = total / 2.0;
        let mut median_age = 0.0;
        
        for age in 0..=120 {
            let age_count: f64 = cohorts.iter()
                .filter(|c| c.age == age)
                .map(|c| c.count)
                .sum();
            cumulative += age_count;
            if cumulative >= half {
                median_age = age as f64;
                break;
            }
        }
        
        PopulationMetadata {
            total_population: total,
            median_age,
            male_count,
            female_count,
        }
    }
}

/// Mortality rate by age
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MortalityRate {
    pub age: u32,
    pub male: f64,
    pub female: f64,
}

/// Mortality table
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MortalityTable {
    pub region_id: String,
    pub year: u32,
    pub rates: Vec<MortalityRate>,
}

impl MortalityTable {
    /// Get mortality rate for a specific age and gender
    pub fn get_rate(&self, age: u32, gender: Gender) -> f64 {
        self.rates.iter()
            .find(|r| r.age == age)
            .map(|r| match gender {
                Gender::Male => r.male,
                Gender::Female => r.female,
            })
            .unwrap_or(1.0) // Default: 100% mortality for undefined ages
    }
}

/// Fertility rate by mother's age
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FertilityRate {
    pub age: u32,
    pub rate: f64,
}

/// Fertility table
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FertilityTable {
    pub region_id: String,
    pub year: u32,
    pub rates: Vec<FertilityRate>,
    pub sex_ratio_at_birth: f64, // Males per 100 females
}

impl FertilityTable {
    /// Get fertility rate for a mother's age
    pub fn get_rate(&self, age: u32) -> f64 {
        self.rates.iter()
            .find(|r| r.age == age)
            .map(|r| r.rate)
            .unwrap_or(0.0)
    }
}

/// Shock type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ShockType {
    Mortality,
    Fertility,
    Migration,
}

/// Target specification (all or specific values)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Target<T> {
    All,
    Specific(Vec<T>),
}

/// Age target
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum AgeTarget {
    All,
    Range(AgeGroup),
}

/// Shock modifier
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Shock {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub shock_type: ShockType,
    pub start_year: u32,
    pub end_year: u32,
    pub target_regions: Vec<String>, // Empty = all
    pub target_genders: Vec<Gender>, // Empty = all
    pub target_ages: Option<AgeGroup>, // None = all
    pub modifier: f64, // Multiplier
}

impl Shock {
    /// Check if shock applies to given parameters
    pub fn applies_to(&self, year: u32, region_id: &str, gender: Gender, age: u32) -> bool {
        // Check year range
        if year < self.start_year || year > self.end_year {
            return false;
        }
        
        // Check region
        if !self.target_regions.is_empty() && !self.target_regions.contains(&region_id.to_string()) {
            return false;
        }
        
        // Check gender
        if !self.target_genders.is_empty() && !self.target_genders.contains(&gender) {
            return false;
        }
        
        // Check age
        if let Some(ref age_group) = self.target_ages {
            if !age_group.contains(age) {
                return false;
            }
        }
        
        true
    }
}

/// Scenario definition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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

/// Single year projection result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectionYear {
    pub year: u32,
    pub total_population: f64,
    pub births: f64,
    pub deaths: f64,
    pub net_migration: f64,
    pub natural_change: f64,
    pub growth_rate: f64,
}

/// Complete projection result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectionResult {
    pub scenario_id: String,
    pub computed_at: String,
    pub compute_time_ms: u64,
    pub base_year: u32,
    pub end_year: u32,
    pub years: Vec<ProjectionYear>,
}

/// Projection progress
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectionProgress {
    pub scenario_id: String,
    pub current_year: u32,
    pub total_years: u32,
    pub percent_complete: f64,
    pub estimated_remaining_ms: Option<u64>,
}
