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
  buildReportsZip,
  type AllReportsData,
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

    it('handles empty data array', () => {
      const result = exportYearlyChangeCSV([]);
      
      expect(result).toBe('Year,Population,Births,Deaths,Net Migration');
    });

    it('handles single year', () => {
      const data = [{ year: 2024, population: 5000000, births: 50000, deaths: 45000, migration: 1000 }];
      
      const result = exportYearlyChangeCSV(data);
      
      expect(result).toBe('Year,Population,Births,Deaths,Net Migration\n2024,5000000,50000,45000,1000');
    });

    it('handles negative migration (emigration)', () => {
      const data = [{ year: 2024, population: 10000000, births: 100000, deaths: 90000, migration: -50000 }];
      
      const result = exportYearlyChangeCSV(data);
      
      expect(result).toContain('-50000');
    });

    it('handles very large populations', () => {
      const data = [{ year: 2024, population: 1400000000, births: 17000000, deaths: 10000000, migration: 0 }];
      
      const result = exportYearlyChangeCSV(data);
      
      expect(result).toContain('1400000000');
      expect(result).toContain('17000000');
    });

    it('handles zero values', () => {
      const data = [{ year: 2024, population: 0, births: 0, deaths: 0, migration: 0 }];
      
      const result = exportYearlyChangeCSV(data);
      
      expect(result).toContain('2024,0,0,0,0');
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

    it('handles empty cohorts array', () => {
      const data = { year: 2024, cohorts: [] };
      
      const result = exportPopulationPyramidCSV(data);
      
      expect(result).toBe('Age,Male,Female,Total');
    });

    it('calculates total correctly for each cohort', () => {
      const data = {
        year: 2024,
        cohorts: [
          { age: 25, male: 123456, female: 654321 },
        ],
      };
      
      const result = exportPopulationPyramidCSV(data);
      
      // 123456 + 654321 = 777777
      expect(result).toContain('25,123456,654321,777777');
    });

    it('handles full age range (0-100+)', () => {
      const cohorts = Array.from({ length: 101 }, (_, age) => ({
        age,
        male: 1000 - age * 5,
        female: 1000 - age * 4,
      }));
      const data = { year: 2024, cohorts };
      
      const result = exportPopulationPyramidCSV(data);
      const lines = result.split('\n');
      
      // Header + 101 ages (0-100)
      expect(lines.length).toBe(102);
      expect(result).toContain('0,1000,1000,2000');
      expect(result).toContain('100,500,600,1100');
    });

    it('handles zero population in age groups', () => {
      const data = {
        year: 2024,
        cohorts: [
          { age: 0, male: 100, female: 100 },
          { age: 100, male: 0, female: 0 },
        ],
      };
      
      const result = exportPopulationPyramidCSV(data);
      
      expect(result).toContain('100,0,0,0');
    });

    it('maintains age order from input', () => {
      const data = {
        year: 2024,
        cohorts: [
          { age: 5, male: 500, female: 500 },
          { age: 0, male: 1000, female: 1000 },
          { age: 10, male: 400, female: 400 },
        ],
      };
      
      const result = exportPopulationPyramidCSV(data);
      const lines = result.split('\n');
      
      // Order should match input (5, 0, 10)
      expect(lines[1]).toContain('5,500,500,1000');
      expect(lines[2]).toContain('0,1000,1000,2000');
      expect(lines[3]).toContain('10,400,400,800');
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

    it('handles empty data array', () => {
      const result = exportAgeGroupsCSV([], 2024);
      
      expect(result).toBe('Age Group,Male,Female,Total,Percentage');
    });

    it('exports all six standard age groups', () => {
      const data = [
        { label: 'Children (0-14)', male: 1000000, female: 950000, total: 1950000, percentage: 19.5 },
        { label: 'Youth (15-24)', male: 800000, female: 780000, total: 1580000, percentage: 15.8 },
        { label: 'Young Adults (25-44)', male: 1500000, female: 1550000, total: 3050000, percentage: 30.5 },
        { label: 'Middle Adults (45-64)', male: 1200000, female: 1300000, total: 2500000, percentage: 25.0 },
        { label: 'Elderly (65-79)', male: 400000, female: 500000, total: 900000, percentage: 9.0 },
        { label: 'Very Elderly (80+)', male: 50000, female: 70000, total: 120000, percentage: 1.2 },
      ];
      
      const result = exportAgeGroupsCSV(data, 2024);
      const lines = result.split('\n');
      
      // Header + 6 groups
      expect(lines.length).toBe(7);
      expect(result).toContain('Children (0-14)');
      expect(result).toContain('Very Elderly (80+)');
    });

    it('rounds percentages to 2 decimal places', () => {
      const data = [
        { label: 'Test', male: 333333, female: 333334, total: 666667, percentage: 33.333333333 },
      ];
      
      const result = exportAgeGroupsCSV(data, 2024);
      
      // Should be rounded to 33.33
      expect(result).toContain('33.33');
      expect(result).not.toContain('33.333');
    });

    it('handles labels with parentheses correctly', () => {
      const data = [
        { label: 'Children (0-14)', male: 100, female: 100, total: 200, percentage: 50.0 },
      ];
      
      const result = exportAgeGroupsCSV(data, 2024);
      
      // Parentheses don't need escaping in CSV
      expect(result).toContain('Children (0-14),100,100,200,50');
    });

    it('handles zero values in all fields', () => {
      const data = [
        { label: 'Empty Group', male: 0, female: 0, total: 0, percentage: 0 },
      ];
      
      const result = exportAgeGroupsCSV(data, 2024);
      
      expect(result).toContain('Empty Group,0,0,0,0');
    });

    it('handles 100% in a single group', () => {
      const data = [
        { label: 'All Population', male: 5000000, female: 5000000, total: 10000000, percentage: 100.0 },
      ];
      
      const result = exportAgeGroupsCSV(data, 2024);
      
      expect(result).toContain('100');
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

    it('handles floating-point precision issues in qx values', () => {
      // These values can cause floating-point precision issues in JavaScript
      // e.g., 0.00012 might become 0.00011999999999999999
      const data = [
        { age: 5, qx: 0.00012, lx: 99500, dx: 12, Lx: 99494, Tx: 7000000, ex: 70.35 },
        { age: 6, qx: 0.00011, lx: 99488, dx: 11, Lx: 99482.5, Tx: 6900506, ex: 69.36 },
      ];
      
      const result = exportLifeTableCSV(data);
      
      // Should NOT contain long floating-point strings
      expect(result).not.toMatch(/0\.000\d{10,}/); // No more than 10 digits after decimal
      expect(result).not.toMatch(/\d+\.\d{10,}/);  // No values with 10+ decimal places
      
      // Should contain properly rounded values
      expect(result).toContain('0.00012');
      expect(result).toContain('0.00011');
    });

    it('rounds Lx and Tx to reasonable precision', () => {
      const data = [
        { age: 0, qx: 0.005, lx: 100000, dx: 500, Lx: 99708.12345678, Tx: 7541943.6789, ex: 75.41943599999999 },
      ];
      
      const result = exportLifeTableCSV(data);
      
      // Lx and Tx should be rounded to 1 decimal place
      expect(result).toContain('99708.1');
      expect(result).toContain('7541943.7');
      // ex should be rounded to 2 decimal places
      expect(result).toContain('75.42');
    });
  });

  describe('Floating-point precision', () => {
    it('exportDependencyRatiosCSV handles floating-point precision', () => {
      // 28.571428571428573 is a common floating-point result
      const data = [
        { year: 2024, youthPop: 2000000, workingAgePop: 7000000, elderlyPop: 1000000, 
          youthRatio: 28.571428571428573, oldAgeRatio: 14.285714285714286, totalRatio: 42.857142857142854 },
      ];
      
      const result = exportDependencyRatiosCSV(data);
      
      // Should not contain long decimal strings
      expect(result).not.toMatch(/\d+\.\d{10,}/);
      // Should have properly rounded values
      expect(result).toContain('28.57');
      expect(result).toContain('14.29');
      expect(result).toContain('42.86');
    });

    it('exportSexRatiosCSV handles floating-point precision', () => {
      const data = [
        { year: 2024, overallRatio: 98.51234567890123, atBirthRatio: 105.00000000000001, 
          childrenRatio: 104.49999999999999, workingAgeRatio: 99.12345678901234, 
          elderlyRatio: 74.99999999999999, totalMale: 4900000, totalFemale: 5100000 },
      ];
      
      const result = exportSexRatiosCSV(data);
      
      // Should not contain long decimal strings
      expect(result).not.toMatch(/\d+\.\d{10,}/);
    });

    it('exportMedianAgeCSV handles floating-point precision', () => {
      const data = [
        { year: 2024, medianAge: 38.49999999999999, medianAgeMale: 37.19999999999999, 
          medianAgeFemale: 39.80000000000001, change: 0.20000000000000018 },
      ];
      
      const result = exportMedianAgeCSV(data);
      
      // Should not contain long decimal strings
      expect(result).not.toMatch(/\d+\.\d{10,}/);
      // Should have properly rounded values
      expect(result).toContain('38.5');
      expect(result).toContain('37.2');
      expect(result).toContain('39.8');
      expect(result).toContain('0.2');
    });

    it('exportAgeGroupsCSV handles floating-point precision in percentages', () => {
      const data = [
        { label: 'Children', male: 1000000, female: 950000, total: 1950000, percentage: 19.50000000000001 },
      ];
      
      const result = exportAgeGroupsCSV(data, 2024);
      
      // Should not contain long decimal strings
      expect(result).not.toMatch(/\d+\.\d{10,}/);
      expect(result).toContain('19.5');
    });
  });

  describe('buildReportsZip', () => {
    it('creates a ZIP with the workspace folder', async () => {
      const data: AllReportsData = {
        workspaceName: 'test-workspace',
        yearlyChange: [
          { year: 2024, population: 10000000, births: 100000, deaths: 80000, migration: 5000 },
        ],
      };

      const zip = buildReportsZip(data);
      
      // Verify the ZIP has the workspace folder
      expect(zip.folder('test-workspace')).not.toBeNull();
    });

    it('includes yearly change CSV when data is provided', async () => {
      const data: AllReportsData = {
        workspaceName: 'test',
        yearlyChange: [
          { year: 2024, population: 10000000, births: 100000, deaths: 80000, migration: 5000 },
          { year: 2025, population: 10025000, births: 98000, deaths: 82000, migration: 4000 },
        ],
      };

      const zip = buildReportsZip(data);
      
      // Verify the ZIP contents
      const yearlyChangeFile = zip.file('test/yearly-change.csv');
      expect(yearlyChangeFile).not.toBeNull();
      
      const content = await yearlyChangeFile!.async('string');
      expect(content).toContain('Year,Population,Births,Deaths,Net Migration');
      expect(content).toContain('2024');
      expect(content).toContain('2025');
    });

    it('includes population pyramids for each year', async () => {
      const data: AllReportsData = {
        workspaceName: 'test',
        populationByYear: [
          { year: 2024, cohorts: [{ age: 0, male: 50000, female: 48000 }], total: 98000 },
          { year: 2025, cohorts: [{ age: 0, male: 49000, female: 47000 }], total: 96000 },
        ],
      };

      const zip = buildReportsZip(data);
      
      const pyramid2024 = zip.file('test/population-pyramids/pyramid-2024.csv');
      const pyramid2025 = zip.file('test/population-pyramids/pyramid-2025.csv');
      
      expect(pyramid2024).not.toBeNull();
      expect(pyramid2025).not.toBeNull();
      
      // Verify content
      const content = await pyramid2024!.async('string');
      expect(content).toContain('Age,Male,Female,Total');
    });

    it('includes age groups for each year', async () => {
      const data: AllReportsData = {
        workspaceName: 'test',
        ageGroups: [
          { year: 2024, groups: [{ label: 'Children', male: 1000, female: 1000, total: 2000, percentage: 20 }] },
          { year: 2025, groups: [{ label: 'Children', male: 950, female: 950, total: 1900, percentage: 19 }] },
        ],
      };

      const zip = buildReportsZip(data);
      
      expect(zip.file('test/age-groups/age-groups-2024.csv')).not.toBeNull();
      expect(zip.file('test/age-groups/age-groups-2025.csv')).not.toBeNull();
    });

    it('includes all report types when all data is provided', async () => {
      const data: AllReportsData = {
        workspaceName: 'full-export',
        yearlyChange: [{ year: 2024, population: 10000000, births: 100000, deaths: 80000, migration: 5000 }],
        populationByYear: [{ year: 2024, cohorts: [{ age: 0, male: 50000, female: 48000 }], total: 98000 }],
        ageGroups: [{ year: 2024, groups: [{ label: 'Children', male: 1000, female: 1000, total: 2000, percentage: 20 }] }],
        dependencyRatios: [{ year: 2024, youthPop: 2000, workingAgePop: 6000, elderlyPop: 2000, youthRatio: 33.3, oldAgeRatio: 33.3, totalRatio: 66.6 }],
        sexRatios: [{ year: 2024, overallRatio: 102, atBirthRatio: 105, childrenRatio: 104, workingAgeRatio: 101, elderlyRatio: 85, totalMale: 5100, totalFemale: 5000 }],
        cohortTracking: { birthYear: 2024, data: [{ year: 2024, age: 0, population: 98000, male: 50000, female: 48000 }] },
        medianAge: [{ year: 2024, medianAge: 38.5, medianAgeMale: 37.2, medianAgeFemale: 39.8 }],
        lifeTable: [{ age: 0, qx: 0.005, lx: 100000, dx: 500, Lx: 99750, Tx: 7800000, ex: 78.0 }],
      };

      const zip = buildReportsZip(data);
      
      // Check all expected files are present
      expect(zip.file('full-export/yearly-change.csv')).not.toBeNull();
      expect(zip.file('full-export/population-pyramids/pyramid-2024.csv')).not.toBeNull();
      expect(zip.file('full-export/age-groups/age-groups-2024.csv')).not.toBeNull();
      expect(zip.file('full-export/dependency-ratios.csv')).not.toBeNull();
      expect(zip.file('full-export/sex-ratios.csv')).not.toBeNull();
      expect(zip.file('full-export/cohort-tracking-born-2024.csv')).not.toBeNull();
      expect(zip.file('full-export/median-age.csv')).not.toBeNull();
      expect(zip.file('full-export/life-table.csv')).not.toBeNull();
    });

    it('handles empty data gracefully', () => {
      const data: AllReportsData = {
        workspaceName: 'empty-workspace',
      };

      const zip = buildReportsZip(data);
      
      // Should create a valid ZIP with just the folder
      expect(zip.file('empty-workspace/yearly-change.csv')).toBeNull();
      // Folder should exist
      expect(zip.folder('empty-workspace')).not.toBeNull();
    });

    it('verifies CSV content in life table file', async () => {
      const data: AllReportsData = {
        workspaceName: 'test',
        lifeTable: [
          { age: 0, qx: 0.005, lx: 100000, dx: 500, Lx: 99750, Tx: 7800000, ex: 78.0 },
          { age: 1, qx: 0.001, lx: 99500, dx: 100, Lx: 99450, Tx: 7700250, ex: 77.39 },
        ],
      };

      const zip = buildReportsZip(data);
      
      const lifeTableFile = zip.file('test/life-table.csv');
      expect(lifeTableFile).not.toBeNull();
      
      const content = await lifeTableFile!.async('string');
      expect(content).toContain('Age,qx,lx,dx,Lx,Tx,ex');
      expect(content).toContain('78');
    });
  });
});

