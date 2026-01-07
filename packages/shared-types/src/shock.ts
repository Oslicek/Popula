/**
 * Shock types for modifying demographic rates.
 * Shocks represent events that alter mortality, fertility, or migration.
 */

import type { Gender } from './demographic';

/**
 * Type of demographic rate affected by the shock.
 */
export type ShockType = 'mortality' | 'fertility' | 'migration';

/**
 * Age range for targeting shocks.
 */
export interface AgeRange {
  /** Minimum age (inclusive) */
  min: number;
  /** Maximum age (inclusive) */
  max: number;
}

/**
 * Shock modifier definition.
 * Applies a multiplier to demographic rates during a specified period.
 */
export interface Shock {
  /** Unique shock identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description?: string;
  /** Type of rate to modify */
  type: ShockType;
  /** First year of shock (inclusive) */
  startYear: number;
  /** Last year of shock (inclusive) */
  endYear: number;
  /** Target regions ('all' or specific region IDs) */
  targetRegions: 'all' | string[];
  /** Target genders ('all' or specific genders) */
  targetGenders: 'all' | Gender[];
  /** Target age range ('all' or specific range) */
  targetAges: 'all' | AgeRange;
  /** 
   * Rate modifier.
   * - For mortality/fertility: multiplier (1.0 = no change, 1.5 = 50% increase)
   * - For migration: additive count change
   */
  modifier: number;
  /**
   * Optional intensity curve over time.
   * If provided, modifier is scaled by this curve.
   * Array index corresponds to year offset from startYear.
   * Values should be 0-1 (0 = no effect, 1 = full modifier).
   */
  intensityCurve?: number[];
}

/**
 * Predefined shock templates for common scenarios.
 */
export interface ShockTemplate {
  /** Template identifier */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Category for UI grouping */
  category: 'pandemic' | 'war' | 'migration' | 'policy' | 'custom';
  /** Default shock configuration (without years) */
  defaults: Omit<Shock, 'id' | 'startYear' | 'endYear'>;
}

/**
 * Common shock templates.
 */
export const SHOCK_TEMPLATES: ShockTemplate[] = [
  {
    id: 'pandemic-moderate',
    name: 'Moderate Pandemic',
    description: 'Increased mortality for elderly population (similar to severe flu season)',
    category: 'pandemic',
    defaults: {
      name: 'Moderate Pandemic',
      type: 'mortality',
      targetRegions: 'all',
      targetGenders: 'all',
      targetAges: { min: 65, max: 120 },
      modifier: 1.3, // 30% increase
    },
  },
  {
    id: 'pandemic-severe',
    name: 'Severe Pandemic',
    description: 'Significantly increased mortality across all ages, especially elderly',
    category: 'pandemic',
    defaults: {
      name: 'Severe Pandemic',
      type: 'mortality',
      targetRegions: 'all',
      targetGenders: 'all',
      targetAges: { min: 0, max: 120 },
      modifier: 1.5, // 50% increase overall
      intensityCurve: [0.3, 1.0, 0.8, 0.4, 0.1], // Peaks in year 2
    },
  },
  {
    id: 'war-conventional',
    name: 'Conventional War',
    description: 'Increased mortality for young adult males + emigration',
    category: 'war',
    defaults: {
      name: 'War Casualties',
      type: 'mortality',
      targetRegions: 'all',
      targetGenders: ['male'],
      targetAges: { min: 18, max: 45 },
      modifier: 2.0, // 100% increase
    },
  },
  {
    id: 'baby-boom',
    name: 'Baby Boom',
    description: 'Increased fertility rates (post-war, economic prosperity)',
    category: 'policy',
    defaults: {
      name: 'Baby Boom',
      type: 'fertility',
      targetRegions: 'all',
      targetGenders: ['female'],
      targetAges: { min: 20, max: 40 },
      modifier: 1.4, // 40% increase
    },
  },
  {
    id: 'fertility-decline',
    name: 'Fertility Decline',
    description: 'Decreased fertility (economic crisis, urbanization)',
    category: 'policy',
    defaults: {
      name: 'Fertility Decline',
      type: 'fertility',
      targetRegions: 'all',
      targetGenders: ['female'],
      targetAges: { min: 15, max: 49 },
      modifier: 0.7, // 30% decrease
    },
  },
  {
    id: 'mass-emigration',
    name: 'Mass Emigration',
    description: 'Large-scale emigration of working-age population',
    category: 'migration',
    defaults: {
      name: 'Mass Emigration',
      type: 'migration',
      targetRegions: 'all',
      targetGenders: 'all',
      targetAges: { min: 20, max: 40 },
      modifier: -50000, // 50,000 emigrants per year
    },
  },
  {
    id: 'refugee-influx',
    name: 'Refugee Influx',
    description: 'Large-scale immigration of refugees (all ages)',
    category: 'migration',
    defaults: {
      name: 'Refugee Influx',
      type: 'migration',
      targetRegions: 'all',
      targetGenders: 'all',
      targetAges: 'all',
      modifier: 100000, // 100,000 immigrants per year
    },
  },
];

/**
 * Helper to create a shock from a template.
 */
export function createShockFromTemplate(
  template: ShockTemplate,
  startYear: number,
  endYear: number,
  overrides?: Partial<Shock>
): Shock {
  return {
    id: crypto.randomUUID(),
    startYear,
    endYear,
    ...template.defaults,
    ...overrides,
  };
}
