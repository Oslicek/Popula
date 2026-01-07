//! Demographic Engine - Cohort-Component Method Implementation

use std::collections::HashMap;
use chrono::Utc;
use tracing::debug;

use super::types::*;

/// Demographic Engine implementing the Cohort-Component Method (CCM)
pub struct DemographicEngine {
    /// Current population by "age-gender-region" key
    population: HashMap<String, f64>,
    
    /// Mortality tables by region ID
    mortality_tables: HashMap<String, MortalityTable>,
    
    /// Fertility tables by region ID
    fertility_tables: HashMap<String, FertilityTable>,
    
    /// Active shocks
    shocks: Vec<Shock>,
}

impl DemographicEngine {
    /// Create a new demographic engine
    pub fn new() -> Self {
        Self {
            population: HashMap::new(),
            mortality_tables: HashMap::new(),
            fertility_tables: HashMap::new(),
            shocks: Vec::new(),
        }
    }
    
    /// Generate a cohort key
    fn cohort_key(age: u32, gender: Gender, region_id: &str) -> String {
        let gender_str = match gender {
            Gender::Male => "male",
            Gender::Female => "female",
        };
        format!("{}-{}-{}", age, gender_str, region_id)
    }
    
    /// Parse a cohort key
    fn parse_key(key: &str) -> Option<(u32, Gender, String)> {
        let parts: Vec<&str> = key.splitn(3, '-').collect();
        if parts.len() != 3 {
            return None;
        }
        
        let age: u32 = parts[0].parse().ok()?;
        let gender = match parts[1] {
            "male" => Gender::Male,
            "female" => Gender::Female,
            _ => return None,
        };
        let region_id = parts[2].to_string();
        
        Some((age, gender, region_id))
    }
    
    /// Load initial population from cohorts
    pub fn load_population(&mut self, cohorts: &[Cohort]) {
        self.population.clear();
        for cohort in cohorts {
            let key = Self::cohort_key(cohort.age, cohort.gender, &cohort.region_id);
            self.population.insert(key, cohort.count);
        }
    }
    
    /// Load mortality table for a region
    pub fn load_mortality_table(&mut self, table: MortalityTable) {
        self.mortality_tables.insert(table.region_id.clone(), table);
    }
    
    /// Load fertility table for a region
    pub fn load_fertility_table(&mut self, table: FertilityTable) {
        self.fertility_tables.insert(table.region_id.clone(), table);
    }
    
    /// Add a shock modifier
    pub fn add_shock(&mut self, shock: Shock) {
        self.shocks.push(shock);
    }
    
    /// Clear all shocks
    pub fn clear_shocks(&mut self) {
        self.shocks.clear();
    }
    
    /// Get current population count
    pub fn get_cohort_count(&self, age: u32, gender: Gender, region_id: &str) -> f64 {
        let key = Self::cohort_key(age, gender, region_id);
        self.population.get(&key).copied().unwrap_or(0.0)
    }
    
    /// Apply shock modifiers to a base rate
    fn apply_shocks(&self, shock_type: ShockType, base_value: f64, year: u32, age: u32, gender: Gender, region_id: &str) -> f64 {
        let mut value = base_value;
        
        for shock in &self.shocks {
            if shock.shock_type != shock_type {
                continue;
            }
            
            if shock.applies_to(year, region_id, gender, age) {
                value *= shock.modifier;
            }
        }
        
        // Clamp to valid range
        value.max(0.0).min(1.0)
    }
    
    /// Project population for one year
    pub fn project_year(&mut self, year: u32, region_ids: &[String]) -> ProjectionYear {
        let mut total_births = 0.0;
        let mut total_deaths = 0.0;
        let mut new_population: HashMap<String, f64> = HashMap::new();
        
        let prev_total: f64 = self.population.values().sum();
        
        for region_id in region_ids {
            let mortality = match self.mortality_tables.get(region_id) {
                Some(m) => m,
                None => {
                    debug!("No mortality table for region {}, skipping", region_id);
                    continue;
                }
            };
            
            let fertility = match self.fertility_tables.get(region_id) {
                Some(f) => f,
                None => {
                    debug!("No fertility table for region {}, skipping", region_id);
                    continue;
                }
            };
            
            // Process each cohort
            for age in 0..=120 {
                for gender in [Gender::Male, Gender::Female] {
                    let key = Self::cohort_key(age, gender, region_id);
                    let count = self.population.get(&key).copied().unwrap_or(0.0);
                    
                    if count < 0.001 {
                        continue;
                    }
                    
                    // Get base mortality rate and apply shocks
                    let base_mortality = mortality.get_rate(age, gender);
                    let mortality_rate = self.apply_shocks(
                        ShockType::Mortality,
                        base_mortality,
                        year,
                        age,
                        gender,
                        region_id,
                    );
                    
                    // Calculate deaths and survivors
                    let deaths = count * mortality_rate;
                    let survivors = count - deaths;
                    total_deaths += deaths;
                    
                    // Age the survivors (age + 1 next year)
                    if age < 120 {
                        let new_key = Self::cohort_key(age + 1, gender, region_id);
                        *new_population.entry(new_key).or_insert(0.0) += survivors;
                    }
                    
                    // Calculate births (only from females of reproductive age)
                    if gender == Gender::Female && age >= 15 && age <= 49 {
                        let base_fertility = fertility.get_rate(age);
                        let fertility_rate = self.apply_shocks(
                            ShockType::Fertility,
                            base_fertility,
                            year,
                            age,
                            gender,
                            region_id,
                        );
                        
                        let births = count * fertility_rate;
                        total_births += births;
                        
                        // Distribute births by sex ratio
                        let male_ratio = fertility.sex_ratio_at_birth / (100.0 + fertility.sex_ratio_at_birth);
                        let male_births = births * male_ratio;
                        let female_births = births * (1.0 - male_ratio);
                        
                        let male_key = Self::cohort_key(0, Gender::Male, region_id);
                        let female_key = Self::cohort_key(0, Gender::Female, region_id);
                        
                        *new_population.entry(male_key).or_insert(0.0) += male_births;
                        *new_population.entry(female_key).or_insert(0.0) += female_births;
                    }
                }
            }
        }
        
        // Update population
        self.population = new_population;
        
        let new_total: f64 = self.population.values().sum();
        let natural_change = total_births - total_deaths;
        let growth_rate = if prev_total > 0.0 {
            ((new_total - prev_total) / prev_total) * 100.0
        } else {
            0.0
        };
        
        ProjectionYear {
            year,
            total_population: new_total,
            births: total_births,
            deaths: total_deaths,
            net_migration: 0.0, // TODO: Implement migration
            natural_change,
            growth_rate,
        }
    }
    
    /// Run full projection from base year to end year
    pub fn run_projection(
        &mut self,
        scenario: &Scenario,
        initial_population: &[Cohort],
        mortality_tables: Vec<MortalityTable>,
        fertility_tables: Vec<FertilityTable>,
        mut progress_callback: impl FnMut(ProjectionProgress),
    ) -> ProjectionResult {
        let start_time = std::time::Instant::now();
        
        // Initialize engine
        self.load_population(initial_population);
        for table in mortality_tables {
            self.load_mortality_table(table);
        }
        for table in fertility_tables {
            self.load_fertility_table(table);
        }
        
        // Load shocks from scenario
        self.clear_shocks();
        for shock in &scenario.shocks {
            self.add_shock(shock.clone());
        }
        
        let total_years = scenario.end_year - scenario.base_year;
        let mut years = Vec::with_capacity(total_years as usize);
        
        for year in scenario.base_year..=scenario.end_year {
            let result = self.project_year(year, &scenario.regions);
            years.push(result);
            
            let current_year = year - scenario.base_year;
            let percent = (current_year as f64 / total_years as f64) * 100.0;
            
            progress_callback(ProjectionProgress {
                scenario_id: scenario.id.clone(),
                current_year: year,
                total_years,
                percent_complete: percent,
                estimated_remaining_ms: None,
            });
        }
        
        let compute_time = start_time.elapsed();
        
        ProjectionResult {
            scenario_id: scenario.id.clone(),
            computed_at: Utc::now().to_rfc3339(),
            compute_time_ms: compute_time.as_millis() as u64,
            base_year: scenario.base_year,
            end_year: scenario.end_year,
            years,
        }
    }
    
    /// Get current population as cohorts
    pub fn get_population(&self, scenario_id: &str, year: u32) -> Population {
        let mut cohorts = Vec::new();
        
        for (key, &count) in &self.population {
            if let Some((age, gender, region_id)) = Self::parse_key(key) {
                cohorts.push(Cohort {
                    age,
                    gender,
                    region_id,
                    count,
                });
            }
        }
        
        let metadata = Population::calculate_metadata(&cohorts);
        
        Population {
            scenario_id: scenario_id.to_string(),
            year,
            cohorts,
            metadata,
        }
    }
}

impl Default for DemographicEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_cohort_key_roundtrip() {
        let key = DemographicEngine::cohort_key(25, Gender::Male, "CZ");
        let parsed = DemographicEngine::parse_key(&key);
        assert_eq!(parsed, Some((25, Gender::Male, "CZ".to_string())));
    }
    
    #[test]
    fn test_shock_applies() {
        let shock = Shock {
            id: "test".to_string(),
            name: "Test Shock".to_string(),
            description: None,
            shock_type: ShockType::Mortality,
            start_year: 2025,
            end_year: 2026,
            target_regions: vec![],
            target_genders: vec![],
            target_ages: Some(AgeGroup { min: 65, max: 120 }),
            modifier: 1.5,
        };
        
        // Should apply: year in range, age in range
        assert!(shock.applies_to(2025, "CZ", Gender::Male, 70));
        
        // Should not apply: year out of range
        assert!(!shock.applies_to(2024, "CZ", Gender::Male, 70));
        
        // Should not apply: age out of range
        assert!(!shock.applies_to(2025, "CZ", Gender::Male, 30));
    }
}
