//! Cohort-Component Method Tests
//!
//! TDD tests for the demographic projection engine.
//! These tests use minimal datasets to verify CCM behavior.

#![cfg(test)]

use super::types::*;
use super::ccm::CohortComponentModel;

// ============================================================
// TEST FIXTURES - Minimal datasets for testing
// ============================================================

mod fixtures {
    use super::*;

    /// Create a minimal population for testing
    /// Only includes specific ages to keep tests focused
    pub fn minimal_population(region: &str) -> Vec<Cohort> {
        vec![
            // Age 0: newborns
            Cohort { age: 0, gender: Gender::Male, region_id: region.to_string(), count: 100.0 },
            Cohort { age: 0, gender: Gender::Female, region_id: region.to_string(), count: 100.0 },
            // Age 1: toddlers
            Cohort { age: 1, gender: Gender::Male, region_id: region.to_string(), count: 100.0 },
            Cohort { age: 1, gender: Gender::Female, region_id: region.to_string(), count: 100.0 },
            // Age 30: fertile women (peak fertility)
            Cohort { age: 30, gender: Gender::Male, region_id: region.to_string(), count: 100.0 },
            Cohort { age: 30, gender: Gender::Female, region_id: region.to_string(), count: 100.0 },
            // Age 99: elderly (high mortality)
            Cohort { age: 99, gender: Gender::Male, region_id: region.to_string(), count: 50.0 },
            Cohort { age: 99, gender: Gender::Female, region_id: region.to_string(), count: 50.0 },
        ]
    }

    /// Zero mortality table (nobody dies) - for testing pure aging
    pub fn zero_mortality(region: &str) -> MortalityTable {
        MortalityTable {
            region_id: region.to_string(),
            year: 2024,
            rates: (0..=120).map(|age| MortalityRate {
                age,
                male: 0.0,
                female: 0.0,
            }).collect(),
        }
    }

    /// Simple mortality table with age-dependent rates
    pub fn simple_mortality(region: &str) -> MortalityTable {
        MortalityTable {
            region_id: region.to_string(),
            year: 2024,
            rates: (0..=120).map(|age| {
                // Infant mortality: 1%
                // Child/adult: 0.1%
                // Elderly (80+): increases to 20% at 100
                let rate = if age == 0 {
                    0.01 // 1% infant mortality
                } else if age < 80 {
                    0.001 // 0.1% for most ages
                } else {
                    // Exponential increase for elderly
                    0.001 + (age as f64 - 80.0) * 0.005
                };
                MortalityRate {
                    age,
                    male: rate * 1.1, // Males have 10% higher mortality
                    female: rate,
                }
            }).collect(),
        }
    }

    /// 100% mortality table (everyone dies) - for extinction test
    pub fn total_mortality(region: &str) -> MortalityTable {
        MortalityTable {
            region_id: region.to_string(),
            year: 2024,
            rates: (0..=120).map(|age| MortalityRate {
                age,
                male: 1.0,
                female: 1.0,
            }).collect(),
        }
    }

    /// Zero fertility table (no births)
    pub fn zero_fertility(region: &str) -> FertilityTable {
        FertilityTable {
            region_id: region.to_string(),
            year: 2024,
            rates: vec![],
            sex_ratio_at_birth: 105.0,
        }
    }

    /// Simple fertility table - only age 30 has fertility
    pub fn simple_fertility(region: &str) -> FertilityTable {
        FertilityTable {
            region_id: region.to_string(),
            year: 2024,
            rates: vec![
                FertilityRate { age: 30, rate: 0.1 }, // 10% of 30yo women have baby
            ],
            sex_ratio_at_birth: 105.0, // 105 males per 100 females
        }
    }

    /// High fertility for replacement test
    pub fn high_fertility(region: &str) -> FertilityTable {
        FertilityTable {
            region_id: region.to_string(),
            year: 2024,
            rates: (15..=49).map(|age| FertilityRate {
                age,
                rate: 0.05, // 5% per year
            }).collect(),
            sex_ratio_at_birth: 100.0, // Equal for easy math
        }
    }
}

// ============================================================
// UNIT TESTS - Individual CCM components
// ============================================================

mod aging_tests {
    use super::*;
    use super::fixtures::*;

    #[test]
    fn test_pure_aging_cohort_moves_up_one_year() {
        // Given: Population with age 1 cohort, no deaths
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&[
            Cohort { age: 1, gender: Gender::Male, region_id: "TEST".to_string(), count: 100.0 },
        ]);
        ccm.load_mortality_table(zero_mortality("TEST"));
        ccm.load_fertility_table(zero_fertility("TEST"));

        // When: Project one year
        let result = ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: Cohort should now be age 2 with same count
        assert_eq!(ccm.get_count(2, Gender::Male, "TEST"), 100.0);
        assert_eq!(ccm.get_count(1, Gender::Male, "TEST"), 0.0); // Old age is empty
        assert_eq!(result.deaths, 0.0);
    }

    #[test]
    fn test_aging_at_max_age_stays_in_last_bucket() {
        // Given: Population at age 120 (max age)
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&[
            Cohort { age: 120, gender: Gender::Female, region_id: "TEST".to_string(), count: 10.0 },
        ]);
        ccm.load_mortality_table(zero_mortality("TEST"));
        ccm.load_fertility_table(zero_fertility("TEST"));

        // When: Project one year
        ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: Should stay at 120 (open-ended interval)
        assert_eq!(ccm.get_count(120, Gender::Female, "TEST"), 10.0);
    }

    #[test]
    fn test_aging_empty_cohort_remains_empty() {
        // Given: No population
        let mut ccm = CohortComponentModel::new();
        ccm.load_mortality_table(zero_mortality("TEST"));
        ccm.load_fertility_table(zero_fertility("TEST"));

        // When: Project one year
        let result = ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: Everything should be zero
        assert_eq!(result.total_population, 0.0);
        assert_eq!(result.births, 0.0);
        assert_eq!(result.deaths, 0.0);
    }
}

mod mortality_tests {
    use super::*;
    use super::fixtures::*;

    #[test]
    fn test_mortality_reduces_population() {
        // Given: 1000 people with 10% mortality
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&[
            Cohort { age: 50, gender: Gender::Male, region_id: "TEST".to_string(), count: 1000.0 },
        ]);
        
        // Custom mortality: 10% death rate at age 50
        let mortality = MortalityTable {
            region_id: "TEST".to_string(),
            year: 2024,
            rates: vec![MortalityRate { age: 50, male: 0.1, female: 0.1 }],
        };
        ccm.load_mortality_table(mortality);
        ccm.load_fertility_table(zero_fertility("TEST"));

        // When: Project one year
        let result = ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: 100 deaths, 900 survivors move to age 51
        assert!((result.deaths - 100.0).abs() < 0.01, "Expected 100 deaths, got {}", result.deaths);
        assert!((ccm.get_count(51, Gender::Male, "TEST") - 900.0).abs() < 0.01);
    }

    #[test]
    fn test_total_mortality_causes_extinction() {
        // Given: Population with 100% mortality
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&minimal_population("TEST"));
        ccm.load_mortality_table(total_mortality("TEST"));
        ccm.load_fertility_table(zero_fertility("TEST"));

        let initial_pop = ccm.total_population();

        // When: Project one year
        let result = ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: Everyone dies
        assert!((result.deaths - initial_pop).abs() < 0.01);
        assert_eq!(ccm.total_population(), 0.0);
    }

    #[test]
    fn test_male_female_different_mortality() {
        // Given: Same count, different mortality rates
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&[
            Cohort { age: 50, gender: Gender::Male, region_id: "TEST".to_string(), count: 100.0 },
            Cohort { age: 50, gender: Gender::Female, region_id: "TEST".to_string(), count: 100.0 },
        ]);
        
        let mortality = MortalityTable {
            region_id: "TEST".to_string(),
            year: 2024,
            rates: vec![MortalityRate { age: 50, male: 0.2, female: 0.1 }], // Males 2x mortality
        };
        ccm.load_mortality_table(mortality);
        ccm.load_fertility_table(zero_fertility("TEST"));

        // When: Project one year
        ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: More males die
        let males = ccm.get_count(51, Gender::Male, "TEST");
        let females = ccm.get_count(51, Gender::Female, "TEST");
        
        assert!((males - 80.0).abs() < 0.01, "Expected 80 males, got {}", males);
        assert!((females - 90.0).abs() < 0.01, "Expected 90 females, got {}", females);
    }
}

mod fertility_tests {
    use super::*;
    use super::fixtures::*;

    #[test]
    fn test_fertility_creates_births() {
        // Given: 100 women age 30 with 10% fertility
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&[
            Cohort { age: 30, gender: Gender::Female, region_id: "TEST".to_string(), count: 100.0 },
        ]);
        ccm.load_mortality_table(zero_mortality("TEST"));
        ccm.load_fertility_table(simple_fertility("TEST")); // 10% at age 30

        // When: Project one year
        let result = ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: 10 births (100 women × 10%)
        assert!((result.births - 10.0).abs() < 0.01, "Expected 10 births, got {}", result.births);
        
        // Check newborns exist at age 0
        let newborn_males = ccm.get_count(0, Gender::Male, "TEST");
        let newborn_females = ccm.get_count(0, Gender::Female, "TEST");
        assert!(newborn_males > 0.0, "Should have male newborns");
        assert!(newborn_females > 0.0, "Should have female newborns");
        assert!((newborn_males + newborn_females - 10.0).abs() < 0.01);
    }

    #[test]
    fn test_sex_ratio_at_birth() {
        // Given: Women with fertility, sex ratio 100 (equal)
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&[
            Cohort { age: 30, gender: Gender::Female, region_id: "TEST".to_string(), count: 1000.0 },
        ]);
        ccm.load_mortality_table(zero_mortality("TEST"));
        
        let fertility = FertilityTable {
            region_id: "TEST".to_string(),
            year: 2024,
            rates: vec![FertilityRate { age: 30, rate: 0.1 }],
            sex_ratio_at_birth: 100.0, // Equal males and females
        };
        ccm.load_fertility_table(fertility);

        // When: Project one year
        ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: Equal male and female births
        let males = ccm.get_count(0, Gender::Male, "TEST");
        let females = ccm.get_count(0, Gender::Female, "TEST");
        
        assert!((males - females).abs() < 0.01, "Expected equal births, got M:{} F:{}", males, females);
    }

    #[test]
    fn test_no_fertility_for_males() {
        // Given: Only males, no females
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&[
            Cohort { age: 30, gender: Gender::Male, region_id: "TEST".to_string(), count: 1000.0 },
        ]);
        ccm.load_mortality_table(zero_mortality("TEST"));
        ccm.load_fertility_table(simple_fertility("TEST"));

        // When: Project one year
        let result = ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: No births (males can't give birth)
        assert_eq!(result.births, 0.0);
    }

    #[test]
    fn test_zero_fertility_no_births() {
        // Given: Women but zero fertility
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&minimal_population("TEST"));
        ccm.load_mortality_table(zero_mortality("TEST"));
        ccm.load_fertility_table(zero_fertility("TEST"));

        // When: Project one year
        let result = ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: No births
        assert_eq!(result.births, 0.0);
    }
}

mod integration_tests {
    use super::*;
    use super::fixtures::*;

    #[test]
    fn test_full_year_projection() {
        // Given: Complete population with mortality and fertility
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&minimal_population("TEST"));
        ccm.load_mortality_table(simple_mortality("TEST"));
        ccm.load_fertility_table(simple_fertility("TEST"));

        let initial_pop = ccm.total_population();

        // When: Project one year
        let result = ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: Should have births, deaths, and population change
        assert!(result.births > 0.0, "Should have births");
        assert!(result.deaths > 0.0, "Should have deaths");
        assert_eq!(result.natural_change, result.births - result.deaths);
        
        // Population should change
        let final_pop = ccm.total_population();
        let expected_change = result.births - result.deaths;
        assert!((final_pop - initial_pop - expected_change).abs() < 0.1);
    }

    #[test]
    fn test_multi_year_projection() {
        // Given: Population with demographics
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&minimal_population("TEST"));
        ccm.load_mortality_table(simple_mortality("TEST"));
        ccm.load_fertility_table(simple_fertility("TEST"));

        // When: Project 5 years
        let mut results = Vec::new();
        for year in 2024..2029 {
            results.push(ccm.project_one_year(year, &["TEST".to_string()]));
        }

        // Then: Should have 5 results with sequential years
        assert_eq!(results.len(), 5);
        for (i, result) in results.iter().enumerate() {
            assert_eq!(result.year, 2024 + i as u32);
        }
    }

    #[test]
    fn test_growth_rate_calculation() {
        // Given: Simple scenario
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&[
            Cohort { age: 30, gender: Gender::Female, region_id: "TEST".to_string(), count: 1000.0 },
        ]);
        ccm.load_mortality_table(zero_mortality("TEST"));
        ccm.load_fertility_table(simple_fertility("TEST")); // 10% fertility

        // When: Project one year
        let result = ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: Growth rate = (births - deaths) / initial_pop * 100
        // Initial: 1000, Births: 100, Deaths: 0
        // Final: 1000 (aged to 31) + 100 (newborns) = 1100
        // Growth: (1100 - 1000) / 1000 * 100 = 10%
        assert!((result.growth_rate - 10.0).abs() < 0.1, "Expected ~10% growth, got {}", result.growth_rate);
    }
}

mod edge_cases {
    use super::*;
    use super::fixtures::*;

    #[test]
    fn test_negative_count_not_possible() {
        // Mortality can't create negative population
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&[
            Cohort { age: 50, gender: Gender::Male, region_id: "TEST".to_string(), count: 1.0 },
        ]);
        
        // Even with >100% mortality rate (invalid input), should clamp to 0
        let mortality = MortalityTable {
            region_id: "TEST".to_string(),
            year: 2024,
            rates: vec![MortalityRate { age: 50, male: 1.5, female: 1.0 }],
        };
        ccm.load_mortality_table(mortality);
        ccm.load_fertility_table(zero_fertility("TEST"));

        // When: Project
        ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: Population should be 0, not negative
        assert!(ccm.total_population() >= 0.0);
    }

    #[test]
    fn test_very_small_population() {
        // Given: Fractional population (0.001)
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&[
            Cohort { age: 30, gender: Gender::Female, region_id: "TEST".to_string(), count: 0.001 },
        ]);
        ccm.load_mortality_table(zero_mortality("TEST"));
        ccm.load_fertility_table(simple_fertility("TEST"));

        // When: Project
        let result = ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: Should handle gracefully
        assert!(result.births >= 0.0);
        assert!(ccm.total_population() >= 0.0);
    }

    #[test]
    fn test_missing_mortality_rate_defaults_to_death() {
        // Given: Population at age with no mortality rate defined
        let mut ccm = CohortComponentModel::new();
        ccm.load_population(&[
            Cohort { age: 50, gender: Gender::Male, region_id: "TEST".to_string(), count: 100.0 },
        ]);
        
        // Empty mortality table
        let mortality = MortalityTable {
            region_id: "TEST".to_string(),
            year: 2024,
            rates: vec![], // No rates!
        };
        ccm.load_mortality_table(mortality);
        ccm.load_fertility_table(zero_fertility("TEST"));

        // When: Project
        let result = ccm.project_one_year(2024, &["TEST".to_string()]);

        // Then: Should default to 100% mortality (everyone dies)
        assert!((result.deaths - 100.0).abs() < 0.01);
    }
}

