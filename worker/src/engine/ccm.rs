//! Cohort-Component Method Implementation
//!
//! The core demographic projection engine using the Cohort-Component Method (CCM).
//! This is the standard method used by demographers worldwide for population projections.
//!
//! ## Algorithm
//!
//! For each year t → t+1:
//! 1. **Fertility**: Calculate births from women of reproductive age (15-49)
//! 2. **Migration**: Add/subtract net migrants by age/gender
//! 3. **Mortality**: Apply survival rates to reduce cohort sizes
//! 4. **Aging**: Move survivors up one year of age

use std::collections::HashMap;

use super::types::*;

/// Key for storing population by age, gender, and region
fn cohort_key(age: u32, gender: Gender, region_id: &str) -> String {
    let gender_str = match gender {
        Gender::Male => "M",
        Gender::Female => "F",
    };
    format!("{}:{}:{}", age, gender_str, region_id)
}

/// Parse a cohort key back to components
fn parse_cohort_key(key: &str) -> Option<(u32, Gender, String)> {
    let parts: Vec<&str> = key.splitn(3, ':').collect();
    if parts.len() != 3 {
        return None;
    }
    
    let age: u32 = parts[0].parse().ok()?;
    let gender = match parts[1] {
        "M" => Gender::Male,
        "F" => Gender::Female,
        _ => return None,
    };
    let region_id = parts[2].to_string();
    
    Some((age, gender, region_id))
}

/// Maximum age in the model (open-ended interval: 120+)
const MAX_AGE: u32 = 120;

/// Minimum and maximum age for fertility
const FERTILITY_MIN_AGE: u32 = 15;
const FERTILITY_MAX_AGE: u32 = 49;

/// Cohort-Component Model for demographic projections
pub struct CohortComponentModel {
    /// Population counts by "age:gender:region" key
    population: HashMap<String, f64>,
    
    /// Mortality tables by region
    mortality_tables: HashMap<String, MortalityTable>,
    
    /// Fertility tables by region
    fertility_tables: HashMap<String, FertilityTable>,
    
    /// Migration tables by region
    migration_tables: HashMap<String, MigrationTable>,
}

impl CohortComponentModel {
    /// Create a new empty CCM model
    pub fn new() -> Self {
        Self {
            population: HashMap::new(),
            mortality_tables: HashMap::new(),
            fertility_tables: HashMap::new(),
            migration_tables: HashMap::new(),
        }
    }

    /// Load initial population from cohorts
    pub fn load_population(&mut self, cohorts: &[Cohort]) {
        self.population.clear();
        for cohort in cohorts {
            let key = cohort_key(cohort.age, cohort.gender, &cohort.region_id);
            *self.population.entry(key).or_insert(0.0) += cohort.count;
        }
    }

    /// Load a mortality table for a region
    pub fn load_mortality_table(&mut self, table: MortalityTable) {
        self.mortality_tables.insert(table.region_id.clone(), table);
    }

    /// Load a fertility table for a region
    pub fn load_fertility_table(&mut self, table: FertilityTable) {
        self.fertility_tables.insert(table.region_id.clone(), table);
    }

    /// Load a migration table for a region
    pub fn load_migration_table(&mut self, table: MigrationTable) {
        self.migration_tables.insert(table.region_id.clone(), table);
    }

    /// Get population count for a specific cohort
    pub fn get_count(&self, age: u32, gender: Gender, region_id: &str) -> f64 {
        let key = cohort_key(age, gender, region_id);
        self.population.get(&key).copied().unwrap_or(0.0)
    }

    /// Get total population across all cohorts
    pub fn total_population(&self) -> f64 {
        self.population.values().sum()
    }

    /// Get mortality rate for a cohort, defaulting to 100% if not found
    fn get_mortality_rate(&self, age: u32, gender: Gender, region_id: &str) -> f64 {
        self.mortality_tables
            .get(region_id)
            .map(|table| table.get_rate(age, gender))
            .unwrap_or(1.0) // Default: 100% mortality (everyone dies)
    }

    /// Get fertility rate for a woman's age, defaulting to 0
    fn get_fertility_rate(&self, age: u32, region_id: &str) -> f64 {
        self.fertility_tables
            .get(region_id)
            .map(|table| table.get_rate(age))
            .unwrap_or(0.0)
    }

    /// Get sex ratio at birth for a region, defaulting to 105
    fn get_sex_ratio_at_birth(&self, region_id: &str) -> f64 {
        self.fertility_tables
            .get(region_id)
            .map(|table| table.sex_ratio_at_birth)
            .unwrap_or(105.0)
    }

    /// Get net migration for a cohort, defaulting to 0
    fn get_migration_rate(&self, age: u32, gender: Gender, region_id: &str) -> f64 {
        self.migration_tables
            .get(region_id)
            .map(|table| table.get_rate(age, gender))
            .unwrap_or(0.0)
    }

    /// Project population for one year using CCM
    ///
    /// Steps:
    /// 1. Calculate births from fertile women (before any changes)
    /// 2. Apply migration (add immigrants, remove emigrants)
    /// 3. Apply mortality to post-migration population
    /// 4. Age survivors up one year
    /// 5. Add newborns at age 0
    /// 6. Return year summary
    pub fn project_one_year(&mut self, year: u32, regions: &[String]) -> ProjectionYear {
        let initial_population = self.total_population();
        let mut total_births = 0.0;
        let mut total_deaths = 0.0;
        let mut total_migration = 0.0;
        let mut new_population: HashMap<String, f64> = HashMap::new();

        for region_id in regions {
            // Step 1: Calculate births from fertile women (before they age/die/migrate)
            let (births, male_births, female_births) = self.calculate_births(region_id);
            total_births += births;

            // Add newborns at age 0
            if male_births > 0.0 {
                let key = cohort_key(0, Gender::Male, region_id);
                *new_population.entry(key).or_insert(0.0) += male_births;
            }
            if female_births > 0.0 {
                let key = cohort_key(0, Gender::Female, region_id);
                *new_population.entry(key).or_insert(0.0) += female_births;
            }

            // Step 2 & 3 & 4: Process each cohort - migration, mortality, aging
            for age in 0..=MAX_AGE {
                for gender in [Gender::Male, Gender::Female] {
                    let key = cohort_key(age, gender, region_id);
                    let mut count = self.population.get(&key).copied().unwrap_or(0.0);
                    
                    // Step 2: Apply migration
                    let migration = self.get_migration_rate(age, gender, region_id);
                    
                    if migration != 0.0 {
                        if migration > 0.0 {
                            // Immigration: add migrants
                            count += migration;
                            total_migration += migration;
                        } else {
                            // Emigration: remove migrants (but can't go negative)
                            let emigrants = (-migration).min(count);
                            count -= emigrants;
                            total_migration -= emigrants;
                        }
                    }
                    
                    if count <= 0.0 {
                        continue;
                    }

                    // Step 3: Apply mortality
                    let mortality_rate = self.get_mortality_rate(age, gender, region_id);
                    // Clamp mortality rate to [0, 1]
                    let mortality_rate = mortality_rate.clamp(0.0, 1.0);
                    
                    let deaths = count * mortality_rate;
                    let survivors = count - deaths;
                    total_deaths += deaths;

                    // Step 4: Age survivors (or keep at MAX_AGE for open-ended interval)
                    if survivors > 0.0 {
                        let new_age = if age >= MAX_AGE { MAX_AGE } else { age + 1 };
                        let new_key = cohort_key(new_age, gender, region_id);
                        *new_population.entry(new_key).or_insert(0.0) += survivors;
                    }
                }
            }
        }

        // Update population
        self.population = new_population;

        // Calculate summary statistics
        let final_population = self.total_population();
        let natural_change = total_births - total_deaths;
        let growth_rate = if initial_population > 0.0 {
            ((final_population - initial_population) / initial_population) * 100.0
        } else if final_population > 0.0 {
            100.0 // Started from 0, now have population
        } else {
            0.0
        };

        ProjectionYear {
            year,
            total_population: final_population,
            births: total_births,
            deaths: total_deaths,
            net_migration: total_migration,
            natural_change,
            growth_rate,
        }
    }

    /// Calculate births for a region
    ///
    /// Returns (total_births, male_births, female_births)
    fn calculate_births(&self, region_id: &str) -> (f64, f64, f64) {
        let mut total_births = 0.0;

        // Sum births from all fertile women (ages 15-49)
        for age in FERTILITY_MIN_AGE..=FERTILITY_MAX_AGE {
            let women = self.get_count(age, Gender::Female, region_id);
            if women <= 0.0 {
                continue;
            }

            let fertility_rate = self.get_fertility_rate(age, region_id);
            total_births += women * fertility_rate;
        }

        if total_births <= 0.0 {
            return (0.0, 0.0, 0.0);
        }

        // Split births by sex using sex ratio at birth
        let sex_ratio = self.get_sex_ratio_at_birth(region_id);
        // sex_ratio = males per 100 females
        // male_proportion = sex_ratio / (sex_ratio + 100)
        let male_proportion = sex_ratio / (sex_ratio + 100.0);
        
        let male_births = total_births * male_proportion;
        let female_births = total_births * (1.0 - male_proportion);

        (total_births, male_births, female_births)
    }

    /// Get population as cohorts (for output)
    pub fn get_cohorts(&self) -> Vec<Cohort> {
        self.population
            .iter()
            .filter_map(|(key, &count)| {
                parse_cohort_key(key).map(|(age, gender, region_id)| Cohort {
                    age,
                    gender,
                    region_id,
                    count,
                })
            })
            .collect()
    }
}

impl Default for CohortComponentModel {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod unit_tests {
    use super::*;

    #[test]
    fn test_cohort_key_roundtrip() {
        let key = cohort_key(25, Gender::Male, "CZ");
        let parsed = parse_cohort_key(&key);
        assert_eq!(parsed, Some((25, Gender::Male, "CZ".to_string())));
    }

    #[test]
    fn test_cohort_key_female() {
        let key = cohort_key(30, Gender::Female, "TEST");
        assert!(key.contains("F"));
        let parsed = parse_cohort_key(&key);
        assert_eq!(parsed, Some((30, Gender::Female, "TEST".to_string())));
    }

    #[test]
    fn test_new_model_is_empty() {
        let ccm = CohortComponentModel::new();
        assert_eq!(ccm.total_population(), 0.0);
    }

    #[test]
    fn test_load_population() {
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&[
            Cohort { age: 0, gender: Gender::Male, region_id: "TEST".to_string(), count: 100.0 },
            Cohort { age: 0, gender: Gender::Female, region_id: "TEST".to_string(), count: 100.0 },
        ]);
        
        assert_eq!(ccm.total_population(), 200.0);
        assert_eq!(ccm.get_count(0, Gender::Male, "TEST"), 100.0);
        assert_eq!(ccm.get_count(0, Gender::Female, "TEST"), 100.0);
    }
}

