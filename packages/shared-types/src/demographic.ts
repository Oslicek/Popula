// ============================================================
// CORE DEMOGRAPHIC TYPES
// ============================================================

/** Gender enumeration */
export type Gender = 'male' | 'female';

/** Age group representation (single year or range) */
export interface AgeGroup {
  readonly min: number;
  readonly max: number; // For single-year: min === max
}

/** Geographic region identifier */
export interface Region {
  readonly id: string;
  readonly name: string;
  readonly parentId?: string; // For hierarchical regions (country → state → city)
}

/** Population cohort: count of people by age, gender, region */
export interface Cohort {
  readonly age: number;        // Single year of age (0-120)
  readonly gender: Gender;
  readonly regionId: string;
  readonly count: number;
}

/** Population metadata */
export interface PopulationMetadata {
  readonly totalPopulation: number;
  readonly medianAge: number;
  readonly maleCount: number;
  readonly femaleCount: number;
}

/** Population: Collection of cohorts for a point in time */
export interface Population {
  readonly scenarioId: string;
  readonly year: number;
  readonly cohorts: readonly Cohort[];
  readonly metadata: PopulationMetadata;
}

// ============================================================
// DEMOGRAPHIC TABLES
// ============================================================

/** Mortality rate entry by age and gender */
export interface MortalityRate {
  readonly age: number;
  readonly male: number;    // Probability of death (0-1)
  readonly female: number;  // Probability of death (0-1)
}

/** Mortality rates table for a region and year */
export interface MortalityTable {
  readonly regionId: string;
  readonly year: number;
  readonly rates: readonly MortalityRate[];
}

/** Fertility rate entry by mother's age */
export interface FertilityRate {
  readonly age: number;     // Mother's age (typically 15-49)
  readonly rate: number;    // Births per woman per year
}

/** Fertility rates table for a region and year */
export interface FertilityTable {
  readonly regionId: string;
  readonly year: number;
  readonly rates: readonly FertilityRate[];
  readonly sexRatioAtBirth: number; // Males per 100 females (typically ~105)
}

// ============================================================
// MIGRATION
// ============================================================

/** Standard migration age profile types */
export type MigrationProfileType = 
  | 'labor'      // Young adults (20-35 peak)
  | 'family'     // Parents with children
  | 'refugee'    // Crisis migration (all ages)
  | 'retirement' // Elderly (60+ peak)
  | 'student';   // Young adults (18-25 peak)

/** Migration flow between regions or in/out of system */
export interface MigrationFlow {
  readonly year: number;
  readonly fromRegionId: string | null;  // null = immigration from outside
  readonly toRegionId: string | null;    // null = emigration to outside
  readonly count: number;
  readonly profile: MigrationProfileType | readonly number[]; // Profile type or custom age distribution
  readonly genderRatio: number; // Males per 100 migrants (50 = equal)
}

// ============================================================
// SHOCKS (SCENARIO MODIFIERS)
// ============================================================

/** Shock type */
export type ShockType = 'mortality' | 'fertility' | 'migration';

/** Shock modifier - applies to demographic rates */
export interface Shock {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly type: ShockType;
  readonly startYear: number;
  readonly endYear: number;
  readonly targetRegions: readonly string[] | 'all';
  readonly targetGenders: readonly Gender[] | 'all';
  readonly targetAges: AgeGroup | 'all';
  readonly modifier: number; // Multiplier (1.5 = 50% increase, 0.8 = 20% decrease)
}

// ============================================================
// SCENARIOS
// ============================================================

/** Complete scenario definition */
export interface Scenario {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly baseYear: number;
  readonly endYear: number;
  readonly regions: readonly string[];
  readonly shocks: readonly Shock[];
  readonly createdAt: string;  // ISO 8601
  readonly updatedAt: string;  // ISO 8601
}

/** Scenario summary (for listings) */
export interface ScenarioSummary {
  readonly id: string;
  readonly name: string;
  readonly baseYear: number;
  readonly endYear: number;
  readonly regionCount: number;
  readonly shockCount: number;
  readonly createdAt: string;
}

// ============================================================
// PROJECTION RESULTS
// ============================================================

/** Single year projection result */
export interface ProjectionYear {
  readonly year: number;
  readonly totalPopulation: number;
  readonly births: number;
  readonly deaths: number;
  readonly netMigration: number;
  readonly naturalChange: number; // births - deaths
  readonly growthRate: number;    // Percentage change from previous year
}

/** Complete projection result */
export interface ProjectionResult {
  readonly scenarioId: string;
  readonly computedAt: string;    // ISO 8601
  readonly computeTimeMs: number;
  readonly baseYear: number;
  readonly endYear: number;
  readonly years: readonly ProjectionYear[];
}

/** Projection progress update */
export interface ProjectionProgress {
  readonly scenarioId: string;
  readonly currentYear: number;
  readonly totalYears: number;
  readonly percentComplete: number;
  readonly estimatedRemainingMs?: number;
}

// ============================================================
// AGGREGATION
// ============================================================

/** Options for aggregating population data */
export interface AggregationOptions {
  readonly ageGroupSize?: number;  // Group into N-year buckets (5, 10, etc.)
  readonly byGender?: boolean;
  readonly byRegion?: boolean;
}

/** Aggregated population data point */
export interface AggregatedPopulation {
  readonly ageGroupStart: number;
  readonly ageGroupEnd: number;
  readonly gender?: Gender;
  readonly regionId?: string;
  readonly count: number;
  readonly percentage: number;
}

// ============================================================
// UTILITY TYPES
// ============================================================

/** Create a mutable version of a readonly type */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/** Create a new scenario (without id, timestamps) */
export type NewScenario = Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>;

/** Create a new shock (without id) */
export type NewShock = Omit<Shock, 'id'>;
