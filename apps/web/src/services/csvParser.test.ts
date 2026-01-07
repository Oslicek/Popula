import { describe, it, expect } from 'vitest';
import {
  parsePopulationCSV,
  parseMortalityCSV,
  parseFertilityCSV,
  parseMigrationCSV,
  CSVParseError,
} from './csvParser';

describe('CSV Parser', () => {
  describe('parsePopulationCSV', () => {
    it('should parse valid population CSV', () => {
      const csv = `age,male,female
0,1000,950
1,980,940
2,970,930`;
      
      const result = parsePopulationCSV(csv);
      
      expect(result.rows).toHaveLength(3);
      expect(result.rows[0]).toEqual({ age: 0, male: 1000, female: 950 });
      expect(result.rows[1]).toEqual({ age: 1, male: 980, female: 940 });
      expect(result.totalMale).toBe(2950);
      expect(result.totalFemale).toBe(2820);
      expect(result.total).toBe(5770);
    });

    it('should handle CSV with extra whitespace', () => {
      const csv = `age, male, female
0, 1000, 950
1, 980, 940`;
      
      const result = parsePopulationCSV(csv);
      
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]?.male).toBe(1000);
    });

    it('should handle CSV with different line endings', () => {
      const csv = "age,male,female\r\n0,1000,950\r\n1,980,940";
      
      const result = parsePopulationCSV(csv);
      
      expect(result.rows).toHaveLength(2);
    });

    it('should throw error for missing columns', () => {
      const csv = `age,male
0,1000`;
      
      expect(() => parsePopulationCSV(csv)).toThrow(CSVParseError);
      expect(() => parsePopulationCSV(csv)).toThrow('Missing required column: female');
    });

    it('should throw error for invalid number', () => {
      const csv = `age,male,female
0,1000,abc`;
      
      expect(() => parsePopulationCSV(csv)).toThrow(CSVParseError);
      expect(() => parsePopulationCSV(csv)).toThrow('Invalid number');
    });

    it('should throw error for negative population', () => {
      const csv = `age,male,female
0,-100,950`;
      
      expect(() => parsePopulationCSV(csv)).toThrow(CSVParseError);
      expect(() => parsePopulationCSV(csv)).toThrow('negative');
    });

    it('should throw error for empty CSV', () => {
      expect(() => parsePopulationCSV('')).toThrow(CSVParseError);
      expect(() => parsePopulationCSV('age,male,female')).toThrow('No data rows');
    });

    it('should skip empty lines', () => {
      const csv = `age,male,female
0,1000,950

1,980,940
`;
      
      const result = parsePopulationCSV(csv);
      expect(result.rows).toHaveLength(2);
    });
  });

  describe('parseMortalityCSV', () => {
    it('should parse valid mortality CSV', () => {
      const csv = `age,male,female
0,0.005,0.004
50,0.01,0.008
100,1.0,1.0`;
      
      const result = parseMortalityCSV(csv);
      
      expect(result.rows).toHaveLength(3);
      expect(result.rows[0]).toEqual({ age: 0, male: 0.005, female: 0.004 });
      expect(result.rows[2]).toEqual({ age: 100, male: 1.0, female: 1.0 });
    });

    it('should throw error for mortality rate > 1', () => {
      const csv = `age,male,female
0,1.5,0.004`;
      
      expect(() => parseMortalityCSV(csv)).toThrow(CSVParseError);
      expect(() => parseMortalityCSV(csv)).toThrow('between 0 and 1');
    });

    it('should throw error for negative mortality rate', () => {
      const csv = `age,male,female
0,-0.01,0.004`;
      
      expect(() => parseMortalityCSV(csv)).toThrow(CSVParseError);
      expect(() => parseMortalityCSV(csv)).toThrow('between 0 and 1');
    });
  });

  describe('parseFertilityCSV', () => {
    it('should parse valid fertility CSV', () => {
      const csv = `age,rate
15,0.01
20,0.05
25,0.10
30,0.08
35,0.04`;
      
      const result = parseFertilityCSV(csv);
      
      expect(result.rows).toHaveLength(5);
      expect(result.rows[0]).toEqual({ age: 15, rate: 0.01 });
      expect(result.totalFertilityRate).toBeCloseTo(0.28, 5);
    });

    it('should throw error for negative fertility rate', () => {
      const csv = `age,rate
20,-0.05`;
      
      expect(() => parseFertilityCSV(csv)).toThrow(CSVParseError);
      expect(() => parseFertilityCSV(csv)).toThrow('negative');
    });

    it('should handle single column header variations', () => {
      const csv = `age,rate
20,0.05`;
      
      const result = parseFertilityCSV(csv);
      expect(result.rows).toHaveLength(1);
    });
  });

  describe('parseMigrationCSV', () => {
    it('should parse valid migration CSV with positive values', () => {
      const csv = `age,male,female
20,100,80
25,150,120
30,50,40`;
      
      const result = parseMigrationCSV(csv);
      
      expect(result.rows).toHaveLength(3);
      expect(result.netMale).toBe(300);
      expect(result.netFemale).toBe(240);
      expect(result.netTotal).toBe(540);
    });

    it('should parse migration CSV with negative values (emigration)', () => {
      const csv = `age,male,female
20,-50,-40
25,100,80`;
      
      const result = parseMigrationCSV(csv);
      
      expect(result.rows[0]).toEqual({ age: 20, male: -50, female: -40 });
      expect(result.netMale).toBe(50);
      expect(result.netFemale).toBe(40);
    });

    it('should handle zero migration', () => {
      const csv = `age,male,female
50,0,0
60,0,0`;
      
      const result = parseMigrationCSV(csv);
      
      expect(result.netTotal).toBe(0);
    });
  });
});

