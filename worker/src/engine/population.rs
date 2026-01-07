//! Population operations and utilities.

use super::types::{Cohort, Gender, Population, PopulationMetadata};
use std::collections::HashMap;

/// Population builder for constructing population snapshots
pub struct PopulationBuilder {
    scenario_id: String,
    year: u32,
    cohorts: HashMap<(u32, Gender, String), f64>,
}

impl PopulationBuilder {
    /// Create a new population builder
    pub fn new(scenario_id: impl Into<String>, year: u32) -> Self {
        Self {
            scenario_id: scenario_id.into(),
            year,
            cohorts: HashMap::new(),
        }
    }

    /// Add or update a cohort
    pub fn set_cohort(&mut self, age: u32, gender: Gender, region_id: &str, count: f64) {
        self.cohorts.insert((age, gender, region_id.to_string()), count);
    }

    /// Add to existing cohort count
    pub fn add_to_cohort(&mut self, age: u32, gender: Gender, region_id: &str, count: f64) {
        let key = (age, gender, region_id.to_string());
        *self.cohorts.entry(key).or_insert(0.0) += count;
    }

    /// Get cohort count
    pub fn get_cohort(&self, age: u32, gender: Gender, region_id: &str) -> f64 {
        self.cohorts
            .get(&(age, gender, region_id.to_string()))
            .copied()
            .unwrap_or(0.0)
    }

    /// Build the final population snapshot
    pub fn build(self) -> Population {
        let cohorts: Vec<Cohort> = self
            .cohorts
            .into_iter()
            .filter(|(_, count)| *count > 0.0)
            .map(|((age, gender, region_id), count)| Cohort {
                age,
                gender,
                region_id,
                count,
            })
            .collect();

        let metadata = calculate_metadata(&cohorts);

        Population {
            scenario_id: self.scenario_id,
            year: self.year,
            cohorts,
            metadata,
        }
    }
}

/// Calculate population metadata from cohorts
fn calculate_metadata(cohorts: &[Cohort]) -> PopulationMetadata {
    let total_population: f64 = cohorts.iter().map(|c| c.count).sum();
    
    if total_population == 0.0 {
        return PopulationMetadata {
            total_population: 0.0,
            median_age: 0.0,
            sex_ratio: 0.0,
            dependency_ratio: 0.0,
        };
    }

    // Calculate sex ratio
    let male_count: f64 = cohorts
        .iter()
        .filter(|c| c.gender == Gender::Male)
        .map(|c| c.count)
        .sum();
    let female_count: f64 = cohorts
        .iter()
        .filter(|c| c.gender == Gender::Female)
        .map(|c| c.count)
        .sum();
    let sex_ratio = if female_count > 0.0 {
        (male_count / female_count) * 100.0
    } else {
        0.0
    };

    // Calculate median age
    let median_age = calculate_median_age(cohorts, total_population);

    // Calculate dependency ratio: (0-14 + 65+) / (15-64)
    let young: f64 = cohorts
        .iter()
        .filter(|c| c.age <= 14)
        .map(|c| c.count)
        .sum();
    let old: f64 = cohorts
        .iter()
        .filter(|c| c.age >= 65)
        .map(|c| c.count)
        .sum();
    let working: f64 = cohorts
        .iter()
        .filter(|c| c.age >= 15 && c.age <= 64)
        .map(|c| c.count)
        .sum();
    let dependency_ratio = if working > 0.0 {
        ((young + old) / working) * 100.0
    } else {
        0.0
    };

    PopulationMetadata {
        total_population,
        median_age,
        sex_ratio,
        dependency_ratio,
    }
}

/// Calculate median age from cohorts
fn calculate_median_age(cohorts: &[Cohort], total_population: f64) -> f64 {
    if total_population == 0.0 {
        return 0.0;
    }

    // Aggregate by age
    let mut age_counts: Vec<(u32, f64)> = HashMap::<u32, f64>::new()
        .into_iter()
        .collect();
    
    let mut counts_by_age: HashMap<u32, f64> = HashMap::new();
    for cohort in cohorts {
        *counts_by_age.entry(cohort.age).or_insert(0.0) += cohort.count;
    }
    
    age_counts = counts_by_age.into_iter().collect();
    age_counts.sort_by_key(|(age, _)| *age);

    let target = total_population / 2.0;
    let mut cumulative = 0.0;

    for (age, count) in age_counts {
        cumulative += count;
        if cumulative >= target {
            return age as f64;
        }
    }

    0.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_population_builder_basic() {
        let mut builder = PopulationBuilder::new("test-scenario", 2024);
        builder.set_cohort(0, Gender::Male, "CZ", 50000.0);
        builder.set_cohort(0, Gender::Female, "CZ", 48000.0);
        builder.set_cohort(30, Gender::Male, "CZ", 100000.0);
        builder.set_cohort(30, Gender::Female, "CZ", 102000.0);

        let population = builder.build();

        assert_eq!(population.scenario_id, "test-scenario");
        assert_eq!(population.year, 2024);
        assert_eq!(population.cohorts.len(), 4);
        assert_eq!(population.metadata.total_population, 300000.0);
    }

    #[test]
    fn test_add_to_cohort() {
        let mut builder = PopulationBuilder::new("test", 2024);
        builder.add_to_cohort(25, Gender::Male, "CZ", 1000.0);
        builder.add_to_cohort(25, Gender::Male, "CZ", 500.0);

        assert_eq!(builder.get_cohort(25, Gender::Male, "CZ"), 1500.0);
    }
}

