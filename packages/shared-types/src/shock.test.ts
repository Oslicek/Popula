import { describe, it, expect } from 'vitest';
import {
  multiplier,
  absolute,
  applyModifier,
  shockApplies,
  pandemicShock,
  warShock,
  migrationCrisisShock,
  type Shock,
} from './shock';

describe('multiplier', () => {
  it('should create a multiplier modifier', () => {
    const mod = multiplier(1.5);
    expect(mod.type).toBe('multiplier');
    expect(mod.value).toBe(1.5);
  });
});

describe('absolute', () => {
  it('should create an absolute modifier', () => {
    const mod = absolute(100000);
    expect(mod.type).toBe('absolute');
    expect(mod.value).toBe(100000);
  });
});

describe('applyModifier', () => {
  it('should apply multiplier correctly', () => {
    const mod = multiplier(1.5);
    expect(applyModifier(100, mod)).toBe(150);
  });

  it('should apply absolute modifier correctly', () => {
    const mod = absolute(50);
    expect(applyModifier(100, mod)).toBe(150);
  });

  it('should throw for function modifiers', () => {
    const mod = { type: 'function' as const, expression: 'x * 2' };
    expect(() => applyModifier(100, mod)).toThrow('Function modifiers must be evaluated on the backend');
  });
});

describe('shockApplies', () => {
  const shock: Shock = {
    id: 'test-shock',
    name: 'Test Shock',
    description: 'A test shock',
    type: 'mortality',
    startYear: 2025,
    endYear: 2026,
    targetRegions: ['CZ', 'SK'],
    targetGenders: ['male'],
    targetAges: { min: 18, max: 45 },
    modifier: multiplier(1.5),
  };

  it('should return false if year is before shock start', () => {
    expect(shockApplies(shock, 2024, 30, 'male', 'CZ')).toBe(false);
  });

  it('should return false if year is after shock end', () => {
    expect(shockApplies(shock, 2027, 30, 'male', 'CZ')).toBe(false);
  });

  it('should return false if region not targeted', () => {
    expect(shockApplies(shock, 2025, 30, 'male', 'DE')).toBe(false);
  });

  it('should return false if gender not targeted', () => {
    expect(shockApplies(shock, 2025, 30, 'female', 'CZ')).toBe(false);
  });

  it('should return false if age not targeted', () => {
    expect(shockApplies(shock, 2025, 50, 'male', 'CZ')).toBe(false);
  });

  it('should return true when all conditions match', () => {
    expect(shockApplies(shock, 2025, 30, 'male', 'CZ')).toBe(true);
  });

  it('should handle "all" for regions', () => {
    const allRegionsShock: Shock = { ...shock, targetRegions: 'all' };
    expect(shockApplies(allRegionsShock, 2025, 30, 'male', 'DE')).toBe(true);
  });

  it('should handle "all" for genders', () => {
    const allGendersShock: Shock = { ...shock, targetGenders: 'all' };
    expect(shockApplies(allGendersShock, 2025, 30, 'female', 'CZ')).toBe(true);
  });

  it('should handle "all" for ages', () => {
    const allAgesShock: Shock = { ...shock, targetAges: 'all' };
    expect(shockApplies(allAgesShock, 2025, 80, 'male', 'CZ')).toBe(true);
  });
});

describe('pandemicShock', () => {
  it('should create a pandemic shock with correct properties', () => {
    const shock = pandemicShock({
      id: 'covid-19',
      name: 'COVID-19 Pandemic',
      startYear: 2020,
      endYear: 2022,
      mortalityIncrease: 1.5,
      minAge: 65,
    });

    expect(shock.id).toBe('covid-19');
    expect(shock.type).toBe('mortality');
    expect(shock.targetAges).toEqual({ min: 65, max: 120 });
    expect(shock.modifier).toEqual(multiplier(1.5));
  });
});

describe('warShock', () => {
  it('should create a war shock targeting young males', () => {
    const shock = warShock({
      id: 'conflict-2025',
      name: 'Regional Conflict',
      startYear: 2025,
      endYear: 2027,
      mortalityIncrease: 3.0,
    });

    expect(shock.type).toBe('mortality');
    expect(shock.targetGenders).toEqual(['male']);
    expect(shock.targetAges).toEqual({ min: 18, max: 45 });
  });
});

describe('migrationCrisisShock', () => {
  it('should create a migration shock with positive migration', () => {
    const shock = migrationCrisisShock({
      id: 'refugee-crisis',
      name: 'Refugee Crisis',
      startYear: 2025,
      endYear: 2026,
      netMigration: 100000,
    });

    expect(shock.type).toBe('migration');
    expect(shock.modifier).toEqual(absolute(100000));
    expect(shock.description).toContain('100'); // Number format varies by locale
  });

  it('should create a migration shock with negative migration', () => {
    const shock = migrationCrisisShock({
      id: 'emigration',
      name: 'Economic Emigration',
      startYear: 2025,
      endYear: 2030,
      netMigration: -50000,
    });

    expect(shock.modifier).toEqual(absolute(-50000));
  });
});

