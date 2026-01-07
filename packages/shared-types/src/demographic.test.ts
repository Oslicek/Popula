import { describe, it, expect } from 'vitest';
import {
  singleYearAge,
  ageRange,
  isAgeInGroup,
  totalPopulation,
  medianAge,
  type Cohort,
} from './demographic';

describe('singleYearAge', () => {
  it('should create an age group for a single year', () => {
    const group = singleYearAge(25);
    expect(group.min).toBe(25);
    expect(group.max).toBe(25);
  });
});

describe('ageRange', () => {
  it('should create an age group for a range', () => {
    const group = ageRange(18, 65);
    expect(group.min).toBe(18);
    expect(group.max).toBe(65);
  });

  it('should throw error if min > max', () => {
    expect(() => ageRange(65, 18)).toThrow('Invalid age range');
  });
});

describe('isAgeInGroup', () => {
  it('should return true for "all"', () => {
    expect(isAgeInGroup(50, 'all')).toBe(true);
    expect(isAgeInGroup(0, 'all')).toBe(true);
    expect(isAgeInGroup(120, 'all')).toBe(true);
  });

  it('should return true when age is within range', () => {
    const group = ageRange(18, 65);
    expect(isAgeInGroup(18, group)).toBe(true);
    expect(isAgeInGroup(40, group)).toBe(true);
    expect(isAgeInGroup(65, group)).toBe(true);
  });

  it('should return false when age is outside range', () => {
    const group = ageRange(18, 65);
    expect(isAgeInGroup(17, group)).toBe(false);
    expect(isAgeInGroup(66, group)).toBe(false);
  });
});

describe('totalPopulation', () => {
  it('should return 0 for empty cohorts', () => {
    expect(totalPopulation([])).toBe(0);
  });

  it('should sum all cohort counts', () => {
    const cohorts: Cohort[] = [
      { age: 0, gender: 'male', regionId: 'CZ', count: 50000 },
      { age: 0, gender: 'female', regionId: 'CZ', count: 48000 },
      { age: 1, gender: 'male', regionId: 'CZ', count: 51000 },
      { age: 1, gender: 'female', regionId: 'CZ', count: 49000 },
    ];
    expect(totalPopulation(cohorts)).toBe(198000);
  });
});

describe('medianAge', () => {
  it('should return 0 for empty cohorts', () => {
    expect(medianAge([])).toBe(0);
  });

  it('should return median age for population', () => {
    // Create a simple population: 100 people at age 20, 100 at age 40
    const cohorts: Cohort[] = [
      { age: 20, gender: 'male', regionId: 'CZ', count: 100 },
      { age: 40, gender: 'male', regionId: 'CZ', count: 100 },
    ];
    // Median should be between 20 and 40, specifically at the point where 
    // cumulative count reaches half. With 200 total, half is 100.
    // After age 20, we have 100, which equals half, so median is 20.
    expect(medianAge(cohorts)).toBe(20);
  });

  it('should handle skewed populations', () => {
    const cohorts: Cohort[] = [
      { age: 10, gender: 'male', regionId: 'CZ', count: 10 },
      { age: 50, gender: 'male', regionId: 'CZ', count: 90 },
    ];
    // Total: 100, half: 50
    // After age 10: cumulative = 10 (< 50)
    // After age 50: cumulative = 100 (>= 50)
    // So median is 50
    expect(medianAge(cohorts)).toBe(50);
  });
});

