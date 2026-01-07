//! Core demographic types

use serde::{Deserialize, Serialize};

/// Gender enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Gender {
    Male,
    Female,
}

/// Age group representation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct AgeGroup {
    pub min: u32,
    pub max: u32,
}

impl AgeGroup {
    pub fn single_year(age: u32) -> Self {
        Self { min: age, max: age }
    }

    pub fn range(min: u32, max: u32) -> Self {
        Self { min, max }
    }

    pub fn contains(&self, age: u32) -> bool {
        age >= self.min && age <= self.max
    }
}

/// Geographic region identifier
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Region {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
}

/// Cohort: Population count by age, gender, and region
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cohort {
    pub age: u32,
    pub gender: Gender,
    pub region_id: String,
    pub count: f64,
}

/// Population metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PopulationMetadata {
    pub total_population: f64,
    pub male_population: f64,
    pub female_population: f64,
    pub median_age: f64,
    pub dependency_ratio: f64,
}

/// Population: Complete demographic state at a point in time
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Population {
    pub cohorts: Vec<Cohort>,
    pub metadata: PopulationMetadata,
}

impl Population {
    /// Create a new population from cohorts, computing metadata automatically
    pub fn from_cohorts(cohorts: Vec<Cohort>) -> Self {
        let metadata = Self::compute_metadata(&cohorts);
        Self { cohorts, metadata }
    }

    fn compute_metadata(cohorts: &[Cohort]) -> PopulationMetadata {
        let mut total = 0.0;
        let mut male = 0.0;
        let mut female = 0.0;
        let mut young = 0.0;  // 0-14
        let mut old = 0.0;    // 65+
        
        for c in cohorts {
            total += c.count;
            match c.gender {
                Gender::Male => male += c.count,
                Gender::Female => female += c.count,
            }
            if c.age < 15 {
                young += c.count;
            } else if c.age >= 65 {
                old += c.count;
            }
        }

        let working_age = total - young - old;
        let dependency_ratio = if working_age > 0.0 {
            (young + old) / working_age * 100.0
        } else {
            0.0
        };

        PopulationMetadata {
            total_population: total,
            male_population: male,
            female_population: female,
            median_age: Self::compute_median_age(cohorts, total),
            dependency_ratio,
        }
    }

    fn compute_median_age(cohorts: &[Cohort], total: f64) -> f64 {
        if total == 0.0 {
            return 0.0;
        }

        let mut sorted: Vec<_> = cohorts.iter().collect();
        sorted.sort_by_key(|c| c.age);

        let half = total / 2.0;
        let mut cumulative = 0.0;

        for cohort in sorted {
            cumulative += cohort.count;
            if cumulative >= half {
                return cohort.age as f64;
            }
        }

        0.0
    }
}

/// Mortality rate for a specific age
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MortalityRate {
    pub age: u32,
    pub male: f64,
    pub female: f64,
}

/// Mortality table: Death probabilities by age and gender
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MortalityTable {
    pub region_id: String,
    pub year: u32,
    pub rates: Vec<MortalityRate>,
}

impl MortalityTable {
    /// Get mortality rate for a specific age and gender
    pub fn get_rate(&self, age: u32, gender: Gender) -> f64 {
        self.rates
            .iter()
            .find(|r| r.age == age)
            .map(|r| match gender {
                Gender::Male => r.male,
                Gender::Female => r.female,
            })
            .unwrap_or(1.0) // Default to 100% mortality for ages not in table
    }
}

/// Fertility rate for a specific age
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FertilityRate {
    pub age: u32,
    pub rate: f64,
}

/// Fertility table: Birth rates by mother's age
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FertilityTable {
    pub region_id: String,
    pub year: u32,
    pub rates: Vec<FertilityRate>,
    /// Males per 100 females at birth (typically ~105)
    pub sex_ratio_at_birth: f64,
}

impl FertilityTable {
    /// Get fertility rate for a specific age
    pub fn get_rate(&self, age: u32) -> f64 {
        self.rates
            .iter()
            .find(|r| r.age == age)
            .map(|r| r.rate)
            .unwrap_or(0.0)
    }
}

/// Projection result for a single year
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectionYear {
    pub year: u32,
    pub population: Population,
    pub births: f64,
    pub deaths: f64,
    pub net_migration: f64,
}

/// Complete projection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectionResult {
    pub scenario_id: String,
    pub computed_at: String,
    pub compute_time_ms: u64,
    pub years: Vec<ProjectionYear>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_age_group_contains() {
        let group = AgeGroup::range(18, 65);
        assert!(group.contains(18));
        assert!(group.contains(40));
        assert!(group.contains(65));
        assert!(!group.contains(17));
        assert!(!group.contains(66));
    }

    #[test]
    fn test_population_metadata() {
        let cohorts = vec![
            Cohort { age: 10, gender: Gender::Male, region_id: "CZ".into(), count: 100.0 },
            Cohort { age: 30, gender: Gender::Female, region_id: "CZ".into(), count: 100.0 },
            Cohort { age: 70, gender: Gender::Male, region_id: "CZ".into(), count: 50.0 },
        ];
        
        let pop = Population::from_cohorts(cohorts);
        
        assert_eq!(pop.metadata.total_population, 250.0);
        assert_eq!(pop.metadata.male_population, 150.0);
        assert_eq!(pop.metadata.female_population, 100.0);
    }
}

