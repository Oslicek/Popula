import { describe, it, expect } from 'vitest';
import {
  generateCSV,
  downloadCSV,
  exportYearlyChangeCSV,
  exportPopulationPyramidCSV,
  exportAgeGroupsCSV,
  exportDependencyRatiosCSV,
  exportSexRatiosCSV,
  exportCohortTrackingCSV,
  exportMedianAgeCSV,
  exportLifeTableCSV,
} from './csvExport';

describe('CSV Export Utilities', () => {
  describe('generateCSV', () => {
    it('generates CSV from array of objects', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const headers = ['name', 'age'];
      
      const result = generateCSV(data, headers);
      
      expect(result).toBe('name,age\nAlice,30\nBob,25');
    });

    it('handles custom header labels', () => {
      const data = [{ firstName: 'Alice', yearsOld: 30 }];
      const headers = ['firstName', 'yearsOld'];
      const labels = { firstName: 'First Name', yearsOld: 'Age' };
      
      const result = generateCSV(data, headers, labels);
      
      expect(result).toBe('First Name,Age\nAlice,30');
    });

    it('escapes commas in values', () => {
      const data = [{ name: 'Doe, John', city: 'New York' }];
      const headers = ['name', 'city'];
      
      const result = generateCSV(data, headers);
      
      expect(result).toBe('name,city\n"Doe, John",New York');
    });

    it('escapes quotes in values', () => {
      const data = [{ quote: 'He said "hello"' }];
      const headers = ['quote'];
      
      const result = generateCSV(data, headers);
      
      expect(result).toBe('quote\n"He said ""hello"""');
    });

    it('handles empty data array', () => {
      const data: Record<string, unknown>[] = [];
      const headers = ['a', 'b'];
      
      const result = generateCSV(data, headers);
      
      expect(result).toBe('a,b');
    });

    it('handles numeric values', () => {
      const data = [{ count: 1000000, rate: 0.0523 }];
      const headers = ['count', 'rate'];
      
      const result = generateCSV(data, headers);
      
      expect(result).toBe('count,rate\n1000000,0.0523');
    });

    it('handles null and undefined values', () => {
      const data = [{ a: null, b: undefined, c: 'value' }];
      const headers = ['a', 'b', 'c'];
      
      const result = generateCSV(data, headers);
      
      expect(result).toBe('a,b,c\n,,value');
    });
  });

  // Note: downloadCSV tests are skipped as they require browser DOM
  // The function is tested through integration/manual testing
  describe('downloadCSV', () => {
    it.skip('creates a download link with correct filename (requires DOM)', () => {
      // This test requires browser environment
    });
  });

  describe('exportYearlyChangeCSV', () => {
    it('formats yearly change data correctly', () => {
      const data = [
        { year: 2024, population: 10000000, births: 100000, deaths: 90000, migration: 5000 },
        { year: 2025, population: 10015000, births: 101000, deaths: 91000, migration: 5000 },
      ];
      
      const result = exportYearlyChangeCSV(data);
      
      expect(result).toContain('Year,Population,Births,Deaths,Net Migration');
      expect(result).toContain('2024,10000000,100000,90000,5000');
      expect(result).toContain('2025,10015000,101000,91000,5000');
    });
  });

  describe('exportPopulationPyramidCSV', () => {
    it('formats pyramid data with year in filename suggestion', () => {
      const data = {
        year: 2024,
        cohorts: [
          { age: 0, male: 50000, female: 48000 },
          { age: 1, male: 49000, female: 47000 },
        ],
      };
      
      const result = exportPopulationPyramidCSV(data);
      
      expect(result).toContain('Age,Male,Female,Total');
      expect(result).toContain('0,50000,48000,98000');
      expect(result).toContain('1,49000,47000,96000');
    });
  });

  describe('exportAgeGroupsCSV', () => {
    it('formats age group data correctly', () => {
      const data = [
        { label: 'Children (0-14)', male: 1000000, female: 950000, total: 1950000, percentage: 19.5 },
        { label: 'Working Age (15-64)', male: 3500000, female: 3600000, total: 7100000, percentage: 71.0 },
      ];
      
      const result = exportAgeGroupsCSV(data, 2024);
      
      expect(result).toContain('Age Group,Male,Female,Total,Percentage');
      expect(result).toContain('Children (0-14),1000000,950000,1950000,19.5');
    });
  });

  describe('exportDependencyRatiosCSV', () => {
    it('formats dependency ratio data correctly', () => {
      const data = [
        { year: 2024, youthPop: 2000000, workingAgePop: 7000000, elderlyPop: 1000000, youthRatio: 28.6, oldAgeRatio: 14.3, totalRatio: 42.9 },
      ];
      
      const result = exportDependencyRatiosCSV(data);
      
      expect(result).toContain('Year,Youth (0-14),Working Age (15-64),Elderly (65+),Youth Ratio,Old-Age Ratio,Total Ratio');
      expect(result).toContain('2024,2000000,7000000,1000000,28.6,14.3,42.9');
    });
  });

  describe('exportSexRatiosCSV', () => {
    it('formats sex ratio data correctly', () => {
      const data = [
        { year: 2024, overallRatio: 98.5, atBirthRatio: 105.0, childrenRatio: 104.5, workingAgeRatio: 99.0, elderlyRatio: 75.0, totalMale: 4900000, totalFemale: 5100000 },
      ];
      
      const result = exportSexRatiosCSV(data);
      
      expect(result).toContain('Year,Overall Ratio,At Birth,Children (0-14),Working Age (15-64),Elderly (65+),Total Male,Total Female');
      expect(result).toContain('2024,98.5,105,104.5,99,75,4900000,5100000');
    });
  });

  describe('exportCohortTrackingCSV', () => {
    it('formats cohort tracking data correctly', () => {
      const data = [
        { year: 2024, age: 0, population: 100000, male: 51000, female: 49000, survivalRate: undefined, cumulativeSurvival: undefined },
        { year: 2025, age: 1, population: 99500, male: 50750, female: 48750, survivalRate: 0.995, cumulativeSurvival: 0.995 },
      ];
      
      const result = exportCohortTrackingCSV(data, 2024);
      
      expect(result).toContain('Year,Age,Population,Male,Female,Survival Rate,Cumulative Survival');
      expect(result).toContain('2024,0,100000,51000,49000,,');
      expect(result).toContain('2025,1,99500,50750,48750,99.5%,99.5%');
    });
  });

  describe('exportMedianAgeCSV', () => {
    it('formats median age data correctly', () => {
      const data = [
        { year: 2024, medianAge: 38.5, medianAgeMale: 37.2, medianAgeFemale: 39.8, change: undefined },
        { year: 2025, medianAge: 38.7, medianAgeMale: 37.4, medianAgeFemale: 40.0, change: 0.2 },
      ];
      
      const result = exportMedianAgeCSV(data);
      
      expect(result).toContain('Year,Median Age,Male Median,Female Median,Change');
      expect(result).toContain('2024,38.5,37.2,39.8,');
      expect(result).toContain('2025,38.7,37.4,40,0.2');
    });
  });

  describe('exportLifeTableCSV', () => {
    it('formats life table data correctly', () => {
      const data = [
        { age: 0, qx: 0.005, lx: 100000, dx: 500, Lx: 99750, Tx: 7500000, ex: 75.0 },
        { age: 1, qx: 0.001, lx: 99500, dx: 100, Lx: 99450, Tx: 7400250, ex: 74.4 },
      ];
      
      const result = exportLifeTableCSV(data);
      
      expect(result).toContain('Age,qx,lx,dx,Lx,Tx,ex');
      expect(result).toContain('0,0.005,100000,500,99750,7500000,75');
      expect(result).toContain('1,0.001,99500,100,99450,7400250,74.4');
    });
  });
});

