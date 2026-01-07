/**
 * CSV Parser for demographic data files
 * 
 * Parses population, mortality, fertility, and migration CSV files
 * into structured data for the projection engine.
 */

import type {
  PopulationData,
  PopulationRow,
  MortalityData,
  MortalityRow,
  FertilityData,
  FertilityRow,
  MigrationData,
  MigrationRow,
} from '@popula/shared-types';

// ============================================================
// Error Types
// ============================================================

export class CSVParseError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: string
  ) {
    super(message);
    this.name = 'CSVParseError';
  }
}

// ============================================================
// Helper Functions
// ============================================================

interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

/**
 * Parse raw CSV text into headers and rows
 */
function parseRawCSV(csv: string): ParsedCSV {
  const lines = csv
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    throw new CSVParseError('CSV file is empty');
  }

  const firstLine = lines[0];
  if (!firstLine) {
    throw new CSVParseError('CSV file is empty');
  }
  
  const headers = firstLine.split(',').map(h => h.trim().toLowerCase());
  
  const rows = lines.slice(1).map(line => 
    line.split(',').map(cell => cell.trim())
  );

  return { headers, rows };
}

/**
 * Get column index by name, throw if missing
 */
function getColumnIndex(headers: string[], name: string): number {
  const index = headers.indexOf(name.toLowerCase());
  if (index === -1) {
    throw new CSVParseError(`Missing required column: ${name}`);
  }
  return index;
}

/**
 * Parse a string to a number, throw if invalid
 */
function parseNumber(value: string | undefined, line: number, column: string): number {
  if (value === undefined) {
    throw new CSVParseError(`Missing value for ${column} at line ${line}`, line, column);
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new CSVParseError(`Invalid number "${value}" at line ${line}`, line, column);
  }
  return num;
}

/**
 * Safely get a row from the raw rows array
 */
function getRow(rawRows: string[][], index: number): string[] {
  const row = rawRows[index];
  if (!row) {
    throw new CSVParseError(`Missing row at index ${index}`);
  }
  return row;
}

// ============================================================
// Population Parser
// ============================================================

/**
 * Parse population CSV
 * Expected format: age,male,female
 */
export function parsePopulationCSV(csv: string): PopulationData {
  const { headers, rows: rawRows } = parseRawCSV(csv);
  
  const ageIdx = getColumnIndex(headers, 'age');
  const maleIdx = getColumnIndex(headers, 'male');
  const femaleIdx = getColumnIndex(headers, 'female');
  
  if (rawRows.length === 0) {
    throw new CSVParseError('No data rows found');
  }

  const rows: PopulationRow[] = [];
  let totalMale = 0;
  let totalFemale = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const lineNum = i + 2; // Account for header + 1-based
    const row = getRow(rawRows, i);
    
    const age = parseNumber(row[ageIdx], lineNum, 'age');
    const male = parseNumber(row[maleIdx], lineNum, 'male');
    const female = parseNumber(row[femaleIdx], lineNum, 'female');
    
    if (male < 0 || female < 0) {
      throw new CSVParseError(
        `Population count cannot be negative at line ${lineNum}`,
        lineNum
      );
    }
    
    rows.push({ age, male, female });
    totalMale += male;
    totalFemale += female;
  }

  return {
    rows,
    totalMale,
    totalFemale,
    total: totalMale + totalFemale,
  };
}

// ============================================================
// Mortality Parser
// ============================================================

/**
 * Parse mortality CSV
 * Expected format: age,male,female
 * Values are probabilities (0-1)
 */
export function parseMortalityCSV(csv: string): MortalityData {
  const { headers, rows: rawRows } = parseRawCSV(csv);
  
  const ageIdx = getColumnIndex(headers, 'age');
  const maleIdx = getColumnIndex(headers, 'male');
  const femaleIdx = getColumnIndex(headers, 'female');
  
  if (rawRows.length === 0) {
    throw new CSVParseError('No data rows found');
  }

  const rows: MortalityRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const lineNum = i + 2;
    const row = getRow(rawRows, i);
    
    const age = parseNumber(row[ageIdx], lineNum, 'age');
    const male = parseNumber(row[maleIdx], lineNum, 'male');
    const female = parseNumber(row[femaleIdx], lineNum, 'female');
    
    if (male < 0 || male > 1 || female < 0 || female > 1) {
      throw new CSVParseError(
        `Mortality rate must be between 0 and 1 at line ${lineNum}`,
        lineNum
      );
    }
    
    rows.push({ age, male, female });
  }

  return { rows };
}

// ============================================================
// Fertility Parser
// ============================================================

/**
 * Parse fertility CSV
 * Expected format: age,rate
 * Values are births per woman per year
 */
export function parseFertilityCSV(csv: string): FertilityData {
  const { headers, rows: rawRows } = parseRawCSV(csv);
  
  const ageIdx = getColumnIndex(headers, 'age');
  const rateIdx = getColumnIndex(headers, 'rate');
  
  if (rawRows.length === 0) {
    throw new CSVParseError('No data rows found');
  }

  const rows: FertilityRow[] = [];
  let totalFertilityRate = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const lineNum = i + 2;
    const row = getRow(rawRows, i);
    
    const age = parseNumber(row[ageIdx], lineNum, 'age');
    const rate = parseNumber(row[rateIdx], lineNum, 'rate');
    
    if (rate < 0) {
      throw new CSVParseError(
        `Fertility rate cannot be negative at line ${lineNum}`,
        lineNum
      );
    }
    
    rows.push({ age, rate });
    totalFertilityRate += rate;
  }

  return { rows, totalFertilityRate };
}

// ============================================================
// Migration Parser
// ============================================================

/**
 * Parse migration CSV
 * Expected format: age,male,female
 * Values can be positive (immigration) or negative (emigration)
 */
export function parseMigrationCSV(csv: string): MigrationData {
  const { headers, rows: rawRows } = parseRawCSV(csv);
  
  const ageIdx = getColumnIndex(headers, 'age');
  const maleIdx = getColumnIndex(headers, 'male');
  const femaleIdx = getColumnIndex(headers, 'female');
  
  if (rawRows.length === 0) {
    throw new CSVParseError('No data rows found');
  }

  const rows: MigrationRow[] = [];
  let netMale = 0;
  let netFemale = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const lineNum = i + 2;
    const row = getRow(rawRows, i);
    
    const age = parseNumber(row[ageIdx], lineNum, 'age');
    const male = parseNumber(row[maleIdx], lineNum, 'male');
    const female = parseNumber(row[femaleIdx], lineNum, 'female');
    
    rows.push({ age, male, female });
    netMale += male;
    netFemale += female;
  }

  return {
    rows,
    netMale,
    netFemale,
    netTotal: netMale + netFemale,
  };
}

