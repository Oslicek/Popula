/**
 * CSV Export Utilities for demographic result tables
 */

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
  return generateCSV(
    data,
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
  return generateCSV(
    data,
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
  return generateCSV(
    data,
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
  const formattedData = data.map(d => ({
    year: d.year,
    medianAge: d.medianAge,
    medianAgeMale: d.medianAgeMale,
    medianAgeFemale: d.medianAgeFemale,
    change: d.change !== undefined ? d.change : '',
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
  return generateCSV(
    data,
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

