import { describe, it, expect } from 'vitest';
import {
  calculateSexRatios,
  calculateCohortTracking,
  calculateMedianAgeProgression,
  calculateLifeTable,
  type CohortData,
  type YearPopulationData,
  type SexRatioData,
  type CohortTrackingData,
  type MedianAgeData,
  type LifeTableRow,
} from './demographicCalculations';

// Helper to create cohort data
function createCohorts(distribution: { age: number; male: number; female: number }[]): CohortData[] {
  return distribution.map(d => ({ age: d.age, male: d.male, female: d.female }));
}

// Helper to create year population data
function createYearData(year: number, cohorts: CohortData[]): YearPopulationData {
  const total = cohorts.reduce((sum, c) => sum + c.male + c.female, 0);
  return { year, cohorts, total };
}

describe('Sex Ratio Calculations', () => {
  it('calculates sex ratio as males per 100 females', () => {
    const cohorts = createCohorts([
      { age: 0, male: 105, female: 100 },
      { age: 1, male: 104, female: 100 },
    ]);
    const yearData = [createYearData(2024, cohorts)];
    
    const result = calculateSexRatios(yearData);
    
    expect(result).toHaveLength(1);
    expect(result[0].year).toBe(2024);
    expect(result[0].overallRatio).toBeCloseTo(104.5, 1); // (209/200)*100
  });

  it('calculates sex ratio by age group', () => {
    const cohorts = createCohorts([
      { age: 0, male: 105, female: 100 },
      { age: 10, male: 104, female: 100 },
      { age: 20, male: 100, female: 100 },
      { age: 50, male: 90, female: 100 },
      { age: 70, male: 60, female: 100 },
    ]);
    const yearData = [createYearData(2024, cohorts)];
    
    const result = calculateSexRatios(yearData);
    
    expect(result[0].childrenRatio).toBeCloseTo(104.5, 1); // 0-14
    expect(result[0].workingAgeRatio).toBeCloseTo(95, 1);  // 15-64
    expect(result[0].elderlyRatio).toBeCloseTo(60, 1);     // 65+
  });

  it('handles zero female population gracefully', () => {
    const cohorts = createCohorts([
      { age: 0, male: 100, female: 0 },
    ]);
    const yearData = [createYearData(2024, cohorts)];
    
    const result = calculateSexRatios(yearData);
    
    expect(result[0].overallRatio).toBe(Infinity);
  });

  it('handles empty cohorts', () => {
    const yearData = [createYearData(2024, [])];
    
    const result = calculateSexRatios(yearData);
    
    // 0/0 = Infinity in our implementation (consistent with zero female)
    expect(result[0].overallRatio).toBe(Infinity);
  });

  it('tracks sex ratio changes over multiple years', () => {
    const year1 = createYearData(2024, createCohorts([
      { age: 0, male: 105, female: 100 },
    ]));
    const year2 = createYearData(2025, createCohorts([
      { age: 0, male: 110, female: 100 },
    ]));
    
    const result = calculateSexRatios([year1, year2]);
    
    expect(result).toHaveLength(2);
    expect(result[0].overallRatio).toBeCloseTo(105, 1);
    expect(result[1].overallRatio).toBeCloseTo(110, 1);
  });
});

describe('Cohort Tracking Calculations', () => {
  it('tracks a birth cohort through time', () => {
    const yearData = [
      createYearData(2024, createCohorts([
        { age: 0, male: 1000, female: 950 },
        { age: 1, male: 990, female: 940 },
      ])),
      createYearData(2025, createCohorts([
        { age: 0, male: 1010, female: 960 },
        { age: 1, male: 995, female: 945 },
      ])),
      createYearData(2026, createCohorts([
        { age: 0, male: 1020, female: 970 },
        { age: 1, male: 1005, female: 955 },
        { age: 2, male: 990, female: 940 },
      ])),
    ];
    
    const result = calculateCohortTracking(yearData, 2024);
    
    expect(result).toHaveLength(3);
    expect(result[0].year).toBe(2024);
    expect(result[0].age).toBe(0);
    expect(result[0].population).toBe(1950); // 1000 + 950
    
    expect(result[1].year).toBe(2025);
    expect(result[1].age).toBe(1);
    expect(result[1].population).toBe(1940); // 995 + 945
    
    expect(result[2].year).toBe(2026);
    expect(result[2].age).toBe(2);
    expect(result[2].population).toBe(1930); // 990 + 940
  });

  it('calculates survival rate between years', () => {
    const yearData = [
      createYearData(2024, createCohorts([{ age: 0, male: 1000, female: 1000 }])),
      createYearData(2025, createCohorts([{ age: 1, male: 990, female: 980 }])),
    ];
    
    const result = calculateCohortTracking(yearData, 2024);
    
    expect(result[0].survivalRate).toBeUndefined(); // First year has no previous
    expect(result[1].survivalRate).toBeCloseTo(0.985, 3); // 1970/2000
  });

  it('returns empty array if birth year not found', () => {
    const yearData = [createYearData(2024, createCohorts([{ age: 0, male: 100, female: 100 }]))];
    
    const result = calculateCohortTracking(yearData, 2020);
    
    expect(result).toHaveLength(0);
  });

  it('handles cohort extinction (all die)', () => {
    const yearData = [
      createYearData(2024, createCohorts([{ age: 99, male: 10, female: 5 }])),
      createYearData(2025, createCohorts([{ age: 100, male: 2, female: 1 }])),
      createYearData(2026, createCohorts([{ age: 101, male: 0, female: 0 }])),
    ];
    
    const result = calculateCohortTracking(yearData, 1925); // Birth year = 2024 - 99
    
    expect(result[0].population).toBe(15);
    expect(result[1].population).toBe(3);
    expect(result[2].population).toBe(0);
  });
});

describe('Median Age Progression Calculations', () => {
  it('calculates median age for a simple population', () => {
    // 100 people at each age 0-99
    const cohorts = Array.from({ length: 100 }, (_, age) => ({
      age,
      male: 50,
      female: 50,
    }));
    const yearData = [createYearData(2024, createCohorts(cohorts))];
    
    const result = calculateMedianAgeProgression(yearData);
    
    // With interpolation, median should be around 50 (half of 10000 is at age 50)
    expect(result[0].medianAge).toBeCloseTo(50, 0);
  });

  it('calculates median age for young population', () => {
    const cohorts = createCohorts([
      { age: 0, male: 500, female: 500 },
      { age: 10, male: 500, female: 500 },
      { age: 20, male: 100, female: 100 },
      { age: 50, male: 50, female: 50 },
    ]);
    const yearData = [createYearData(2024, cohorts)];
    
    const result = calculateMedianAgeProgression(yearData);
    
    expect(result[0].medianAge).toBeLessThan(15); // Skewed young
  });

  it('calculates median age for old population', () => {
    const cohorts = createCohorts([
      { age: 0, male: 50, female: 50 },
      { age: 40, male: 100, female: 100 },
      { age: 60, male: 500, female: 500 },
      { age: 80, male: 400, female: 400 },
    ]);
    const yearData = [createYearData(2024, cohorts)];
    
    const result = calculateMedianAgeProgression(yearData);
    
    expect(result[0].medianAge).toBeGreaterThan(55); // Skewed old
  });

  it('calculates median by sex', () => {
    const cohorts = createCohorts([
      { age: 20, male: 100, female: 50 },
      { age: 50, male: 100, female: 150 },
    ]);
    const yearData = [createYearData(2024, cohorts)];
    
    const result = calculateMedianAgeProgression(yearData);
    
    expect(result[0].medianAgeMale).toBeLessThan(result[0].medianAgeFemale);
  });

  it('tracks median age change over years', () => {
    const year1 = createYearData(2024, createCohorts([
      { age: 20, male: 100, female: 100 },
      { age: 40, male: 100, female: 100 },
    ]));
    const year2 = createYearData(2025, createCohorts([
      { age: 21, male: 98, female: 98 },
      { age: 41, male: 98, female: 98 },
    ]));
    
    const result = calculateMedianAgeProgression([year1, year2]);
    
    expect(result[1].medianAge).toBeGreaterThan(result[0].medianAge);
    expect(result[1].change).toBeCloseTo(1, 0);
  });

  it('handles empty population', () => {
    const yearData = [createYearData(2024, [])];
    
    const result = calculateMedianAgeProgression(yearData);
    
    expect(result[0].medianAge).toBe(0);
  });
});

describe('Life Table Calculations', () => {
  it('calculates life expectancy at birth', () => {
    // Very low mortality rates
    const mortalityRates = Array.from({ length: 101 }, (_, age) => ({
      age,
      qx: age < 80 ? 0.001 : 0.05 + (age - 80) * 0.02, // Low early, increases after 80
    }));
    
    const result = calculateLifeTable(mortalityRates);
    
    expect(result[0].ex).toBeGreaterThan(70); // High life expectancy
    expect(result[0].age).toBe(0);
  });

  it('calculates lx (survivors) correctly', () => {
    const mortalityRates = [
      { age: 0, qx: 0.01 },  // 1% die at age 0
      { age: 1, qx: 0.001 }, // 0.1% die at age 1
      { age: 2, qx: 0.001 },
    ];
    
    const result = calculateLifeTable(mortalityRates);
    
    expect(result[0].lx).toBe(100000); // Radix
    expect(result[1].lx).toBeCloseTo(99000, 0); // 99% survive year 0
    expect(result[2].lx).toBeCloseTo(98901, 0); // 99.9% of 99000 survive year 1
  });

  it('calculates dx (deaths) correctly', () => {
    const mortalityRates = [
      { age: 0, qx: 0.01 },
      { age: 1, qx: 0.001 },
    ];
    
    const result = calculateLifeTable(mortalityRates);
    
    expect(result[0].dx).toBeCloseTo(1000, 0); // 1% of 100000
    expect(result[1].dx).toBeCloseTo(99, 0);   // 0.1% of 99000
  });

  it('life expectancy decreases with age', () => {
    const mortalityRates = Array.from({ length: 101 }, (_, age) => ({
      age,
      qx: 0.001 + age * 0.001,
    }));
    
    const result = calculateLifeTable(mortalityRates);
    
    expect(result[0].ex).toBeGreaterThan(result[20].ex);
    expect(result[20].ex).toBeGreaterThan(result[60].ex);
  });

  it('handles 100% mortality at max age', () => {
    const mortalityRates = [
      { age: 0, qx: 0.5 },
      { age: 1, qx: 1.0 }, // Everyone dies at age 1
    ];
    
    const result = calculateLifeTable(mortalityRates);
    
    expect(result[1].lx).toBeCloseTo(50000, 0);
    expect(result[1].qx).toBe(1.0);
  });

  it('returns empty array for empty input', () => {
    const result = calculateLifeTable([]);
    expect(result).toHaveLength(0);
  });

  it('calculates Lx (person-years lived) correctly', () => {
    const mortalityRates = [
      { age: 0, qx: 0.01 },
      { age: 1, qx: 0.001 },
    ];
    
    const result = calculateLifeTable(mortalityRates);
    
    // Lx = (lx + lx+1) / 2 for ages > 0
    // For age 0, special formula often used
    expect(result[0].Lx).toBeGreaterThan(0);
    expect(result[0].Lx).toBeLessThan(result[0].lx);
  });
});

