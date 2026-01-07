/**
 * Demographic calculation utilities for result views
 */

export interface CohortData {
  age: number;
  male: number;
  female: number;
}

export interface YearPopulationData {
  year: number;
  cohorts: CohortData[];
  total: number;
}

// Sex Ratio Types
export interface SexRatioData {
  year: number;
  overallRatio: number;        // Males per 100 females (total)
  atBirthRatio: number;        // Age 0 ratio
  childrenRatio: number;       // 0-14 ratio
  workingAgeRatio: number;     // 15-64 ratio
  elderlyRatio: number;        // 65+ ratio
  totalMale: number;
  totalFemale: number;
}

// Cohort Tracking Types
export interface CohortTrackingData {
  year: number;
  age: number;
  population: number;
  male: number;
  female: number;
  survivalRate?: number;       // From previous year
  cumulativeSurvival?: number; // From birth year
}

// Median Age Types
export interface MedianAgeData {
  year: number;
  medianAge: number;
  medianAgeMale: number;
  medianAgeFemale: number;
  change?: number;             // Change from previous year
}

// Life Table Types
export interface MortalityRate {
  age: number;
  qx: number;  // Probability of dying between age x and x+1
}

export interface LifeTableRow {
  age: number;
  qx: number;   // Probability of dying
  lx: number;   // Number surviving to age x (out of 100,000)
  dx: number;   // Deaths between age x and x+1
  Lx: number;   // Person-years lived between age x and x+1
  Tx: number;   // Total person-years lived above age x
  ex: number;   // Life expectancy at age x
}

/**
 * Calculate sex ratios (males per 100 females) for each year
 */
export function calculateSexRatios(yearData: YearPopulationData[]): SexRatioData[] {
  return yearData.map(yd => {
    const sumByGroup = (minAge: number, maxAge: number) => {
      let male = 0;
      let female = 0;
      for (const c of yd.cohorts) {
        if (c.age >= minAge && c.age <= maxAge) {
          male += c.male;
          female += c.female;
        }
      }
      return { male, female, ratio: female > 0 ? (male / female) * 100 : Infinity };
    };

    const all = sumByGroup(0, 999);
    const atBirth = sumByGroup(0, 0);
    const children = sumByGroup(0, 14);
    const working = sumByGroup(15, 64);
    const elderly = sumByGroup(65, 999);

    return {
      year: yd.year,
      overallRatio: all.ratio,
      atBirthRatio: atBirth.ratio,
      childrenRatio: children.ratio,
      workingAgeRatio: working.ratio,
      elderlyRatio: elderly.ratio,
      totalMale: all.male,
      totalFemale: all.female,
    };
  });
}

/**
 * Track a specific birth cohort through time
 */
export function calculateCohortTracking(yearData: YearPopulationData[], birthYear: number): CohortTrackingData[] {
  const result: CohortTrackingData[] = [];
  let initialPopulation: number | null = null;
  let prevPopulation: number | null = null;

  for (const yd of yearData) {
    const expectedAge = yd.year - birthYear;
    if (expectedAge < 0) continue;

    const cohort = yd.cohorts.find(c => c.age === expectedAge);
    if (!cohort && result.length === 0) {
      // Haven't found the birth cohort yet
      continue;
    }

    const population = cohort ? cohort.male + cohort.female : 0;
    const male = cohort?.male ?? 0;
    const female = cohort?.female ?? 0;

    if (initialPopulation === null) {
      initialPopulation = population;
    }

    const survivalRate = prevPopulation !== null && prevPopulation > 0 
      ? population / prevPopulation 
      : undefined;
    
    const cumulativeSurvival = initialPopulation > 0 
      ? population / initialPopulation 
      : undefined;

    result.push({
      year: yd.year,
      age: expectedAge,
      population,
      male,
      female,
      survivalRate,
      cumulativeSurvival,
    });

    prevPopulation = population;
  }

  return result;
}

/**
 * Calculate median age for a population
 */
function calculateMedian(cohorts: CohortData[], sex: 'male' | 'female' | 'total'): number {
  // Build cumulative distribution
  const sorted = [...cohorts].sort((a, b) => a.age - b.age);
  
  let totalPop = 0;
  for (const c of sorted) {
    if (sex === 'male') totalPop += c.male;
    else if (sex === 'female') totalPop += c.female;
    else totalPop += c.male + c.female;
  }

  if (totalPop === 0) return 0;

  const halfPop = totalPop / 2;
  let cumulative = 0;

  for (const c of sorted) {
    const pop = sex === 'male' ? c.male : sex === 'female' ? c.female : c.male + c.female;
    const prevCumulative = cumulative;
    cumulative += pop;

    if (cumulative >= halfPop) {
      // Interpolate within this age
      const fraction = pop > 0 ? (halfPop - prevCumulative) / pop : 0;
      return c.age + fraction;
    }
  }

  return sorted[sorted.length - 1]?.age ?? 0;
}

/**
 * Calculate median age progression over years
 */
export function calculateMedianAgeProgression(yearData: YearPopulationData[]): MedianAgeData[] {
  const result: MedianAgeData[] = [];
  let prevMedian: number | null = null;

  for (const yd of yearData) {
    const medianAge = calculateMedian(yd.cohorts, 'total');
    const medianAgeMale = calculateMedian(yd.cohorts, 'male');
    const medianAgeFemale = calculateMedian(yd.cohorts, 'female');

    result.push({
      year: yd.year,
      medianAge,
      medianAgeMale,
      medianAgeFemale,
      change: prevMedian !== null ? medianAge - prevMedian : undefined,
    });

    prevMedian = medianAge;
  }

  return result;
}

/**
 * Calculate a period life table from mortality rates
 * Uses standard actuarial methods
 */
export function calculateLifeTable(mortalityRates: MortalityRate[]): LifeTableRow[] {
  if (mortalityRates.length === 0) return [];

  const sorted = [...mortalityRates].sort((a, b) => a.age - b.age);
  const radix = 100000; // Standard life table radix
  
  const result: LifeTableRow[] = [];
  let lx = radix;

  // First pass: calculate lx, dx, Lx
  for (let i = 0; i < sorted.length; i++) {
    const { age, qx } = sorted[i];
    const clampedQx = Math.min(Math.max(qx, 0), 1);
    
    const dx = Math.round(lx * clampedQx);
    const nextLx = lx - dx;
    
    // Person-years lived in interval
    // For age 0, use special formula (infants die early in year)
    // For other ages, use average of lx and lx+1
    let Lx: number;
    if (age === 0) {
      // Assume 0.3 of infant deaths occur in first half of year
      Lx = nextLx + 0.3 * dx;
    } else {
      Lx = (lx + nextLx) / 2;
    }

    result.push({
      age,
      qx: clampedQx,
      lx,
      dx,
      Lx,
      Tx: 0, // Will calculate in second pass
      ex: 0, // Will calculate in second pass
    });

    lx = nextLx;
  }

  // Second pass: calculate Tx (cumulative person-years from age x to end)
  let Tx = 0;
  for (let i = result.length - 1; i >= 0; i--) {
    Tx += result[i].Lx;
    result[i].Tx = Tx;
  }

  // Third pass: calculate ex (life expectancy at age x)
  for (const row of result) {
    row.ex = row.lx > 0 ? row.Tx / row.lx : 0;
  }

  return result;
}

