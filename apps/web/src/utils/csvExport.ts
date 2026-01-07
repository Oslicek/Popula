/**
 * CSV Export Utilities for demographic result tables
 */

/**
 * Rounds a number to a specified number of decimal places
 * Handles floating-point precision issues (e.g., 0.00011999999999999999 -> 0.00012)
 */
function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Escapes a value for CSV format
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Generates a CSV string from an array of objects
 */
export function generateCSV(
  data: Record<string, unknown>[],
  headers: string[],
  headerLabels?: Record<string, string>
): string {
  // Generate header row
  const headerRow = headers.map(h => headerLabels?.[h] ?? h).join(',');
  
  // Generate data rows
  const dataRows = data.map(row => 
    headers.map(h => escapeCSVValue(row[h])).join(',')
  );
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Triggers a CSV file download in the browser
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export Year-over-Year Change data
 */
export function exportYearlyChangeCSV(
  data: { year: number; population: number; births: number; deaths: number; migration: number }[]
): string {
  return generateCSV(
    data,
    ['year', 'population', 'births', 'deaths', 'migration'],
    {
      year: 'Year',
      population: 'Population',
      births: 'Births',
      deaths: 'Deaths',
      migration: 'Net Migration',
    }
  );
}

/**
 * Export Population Pyramid data for a specific year
 */
export function exportPopulationPyramidCSV(
  data: { year: number; cohorts: { age: number; male: number; female: number }[] }
): string {
  const rows = data.cohorts.map(c => ({
    age: c.age,
    male: c.male,
    female: c.female,
    total: c.male + c.female,
  }));
  
  return generateCSV(
    rows,
    ['age', 'male', 'female', 'total'],
    { age: 'Age', male: 'Male', female: 'Female', total: 'Total' }
  );
}

/**
 * Export Age Groups data
 */
export function exportAgeGroupsCSV(
  data: { label: string; male: number; female: number; total: number; percentage: number }[],
  year: number
): string {
  // Round percentage to avoid floating-point precision issues
  const formattedData = data.map(d => ({
    label: d.label,
    male: d.male,
    female: d.female,
    total: d.total,
    percentage: round(d.percentage, 2),
  }));

  return generateCSV(
    formattedData,
    ['label', 'male', 'female', 'total', 'percentage'],
    {
      label: 'Age Group',
      male: 'Male',
      female: 'Female',
      total: 'Total',
      percentage: 'Percentage',
    }
  );
}

/**
 * Export Dependency Ratios data
 */
export function exportDependencyRatiosCSV(
  data: { year: number; youthPop: number; workingAgePop: number; elderlyPop: number; youthRatio: number; oldAgeRatio: number; totalRatio: number }[]
): string {
  // Round ratios to 2 decimal places
  const formattedData = data.map(d => ({
    year: d.year,
    youthPop: d.youthPop,
    workingAgePop: d.workingAgePop,
    elderlyPop: d.elderlyPop,
    youthRatio: round(d.youthRatio, 2),
    oldAgeRatio: round(d.oldAgeRatio, 2),
    totalRatio: round(d.totalRatio, 2),
  }));

  return generateCSV(
    formattedData,
    ['year', 'youthPop', 'workingAgePop', 'elderlyPop', 'youthRatio', 'oldAgeRatio', 'totalRatio'],
    {
      year: 'Year',
      youthPop: 'Youth (0-14)',
      workingAgePop: 'Working Age (15-64)',
      elderlyPop: 'Elderly (65+)',
      youthRatio: 'Youth Ratio',
      oldAgeRatio: 'Old-Age Ratio',
      totalRatio: 'Total Ratio',
    }
  );
}

/**
 * Export Sex Ratios data
 */
export function exportSexRatiosCSV(
  data: { year: number; overallRatio: number; atBirthRatio: number; childrenRatio: number; workingAgeRatio: number; elderlyRatio: number; totalMale: number; totalFemale: number }[]
): string {
  // Round ratios to 2 decimal places
  const formattedData = data.map(d => ({
    year: d.year,
    overallRatio: round(d.overallRatio, 2),
    atBirthRatio: round(d.atBirthRatio, 2),
    childrenRatio: round(d.childrenRatio, 2),
    workingAgeRatio: round(d.workingAgeRatio, 2),
    elderlyRatio: round(d.elderlyRatio, 2),
    totalMale: d.totalMale,
    totalFemale: d.totalFemale,
  }));

  return generateCSV(
    formattedData,
    ['year', 'overallRatio', 'atBirthRatio', 'childrenRatio', 'workingAgeRatio', 'elderlyRatio', 'totalMale', 'totalFemale'],
    {
      year: 'Year',
      overallRatio: 'Overall Ratio',
      atBirthRatio: 'At Birth',
      childrenRatio: 'Children (0-14)',
      workingAgeRatio: 'Working Age (15-64)',
      elderlyRatio: 'Elderly (65+)',
      totalMale: 'Total Male',
      totalFemale: 'Total Female',
    }
  );
}

/**
 * Export Cohort Tracking data
 */
export function exportCohortTrackingCSV(
  data: { year: number; age: number; population: number; male: number; female: number; survivalRate?: number; cumulativeSurvival?: number }[],
  birthYear: number
): string {
  // Format survival rates as percentages
  const formattedData = data.map(d => ({
    year: d.year,
    age: d.age,
    population: d.population,
    male: d.male,
    female: d.female,
    survivalRate: d.survivalRate !== undefined ? `${(d.survivalRate * 100).toFixed(1)}%` : '',
    cumulativeSurvival: d.cumulativeSurvival !== undefined ? `${(d.cumulativeSurvival * 100).toFixed(1)}%` : '',
  }));
  
  return generateCSV(
    formattedData,
    ['year', 'age', 'population', 'male', 'female', 'survivalRate', 'cumulativeSurvival'],
    {
      year: 'Year',
      age: 'Age',
      population: 'Population',
      male: 'Male',
      female: 'Female',
      survivalRate: 'Survival Rate',
      cumulativeSurvival: 'Cumulative Survival',
    }
  );
}

/**
 * Export Median Age Progression data
 */
export function exportMedianAgeCSV(
  data: { year: number; medianAge: number; medianAgeMale: number; medianAgeFemale: number; change?: number }[]
): string {
  // Round ages to 1 decimal place, change to 2 decimal places
  const formattedData = data.map(d => ({
    year: d.year,
    medianAge: round(d.medianAge, 1),
    medianAgeMale: round(d.medianAgeMale, 1),
    medianAgeFemale: round(d.medianAgeFemale, 1),
    change: d.change !== undefined ? round(d.change, 2) : '',
  }));
  
  return generateCSV(
    formattedData,
    ['year', 'medianAge', 'medianAgeMale', 'medianAgeFemale', 'change'],
    {
      year: 'Year',
      medianAge: 'Median Age',
      medianAgeMale: 'Male Median',
      medianAgeFemale: 'Female Median',
      change: 'Change',
    }
  );
}

/**
 * Export Life Table data
 */
export function exportLifeTableCSV(
  data: { age: number; qx: number; lx: number; dx: number; Lx: number; Tx: number; ex: number }[]
): string {
  // Round values to appropriate precision to avoid floating-point issues
  const formattedData = data.map(row => ({
    age: row.age,
    qx: round(row.qx, 8),        // 8 decimal places for mortality probabilities
    lx: Math.round(row.lx),       // Integer for survivors
    dx: Math.round(row.dx),       // Integer for deaths
    Lx: round(row.Lx, 1),         // 1 decimal for person-years lived
    Tx: round(row.Tx, 1),         // 1 decimal for total person-years
    ex: round(row.ex, 2),         // 2 decimals for life expectancy
  }));

  return generateCSV(
    formattedData,
    ['age', 'qx', 'lx', 'dx', 'Lx', 'Tx', 'ex'],
    {
      age: 'Age',
      qx: 'qx',
      lx: 'lx',
      dx: 'dx',
      Lx: 'Lx',
      Tx: 'Tx',
      ex: 'ex',
    }
  );
}

