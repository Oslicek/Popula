import type { Feature, Geometry } from 'geojson';
import type { RegionProperties } from './types';

/**
 * Parse CSV text of population projections (single-year of age) and aggregate totals for a given year per AREA_CODE.
 * Only rows with COMPONENT=Population and SEX=persons are counted.
 */
export function parsePopulationCsv(csvText: string, year: string): Map<string, number> {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return new Map();

  const header = lines[0].replace(/"/g, '').split(',');
  const yearIdx = header.indexOf(year);
  if (yearIdx === -1) return new Map();

  const codeIdx = 0;
  const componentIdx = 2;
  const sexIdx = 3;

  const totals = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length <= yearIdx) continue;
    if (cols[componentIdx] !== 'Population' || cols[sexIdx] !== 'persons') continue;

    const code = cols[codeIdx];
    const value = Number(cols[yearIdx]);
    if (!Number.isFinite(value)) continue;

    const prev = totals.get(code) ?? 0;
    totals.set(code, prev + value);
  }

  return totals;
}

/**
 * Parse CSV for all available years, returning a map per year and the ordered year list.
 */
export function parsePopulationCsvByYear(csvText: string): { years: string[]; byYear: Map<string, Map<string, number>> } {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { years: [], byYear: new Map() };

  const header = lines[0].replace(/"/g, '').split(',');
  const yearColumns = header
    .map((col, idx) => ({ col, idx }))
    .filter(({ col }) => /^\d{4}$/.test(col));

  const byYear = new Map<string, Map<string, number>>();
  const codeIdx = 0;
  const componentIdx = 2;
  const sexIdx = 3;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols[componentIdx] !== 'Population' || cols[sexIdx] !== 'persons') continue;
    const code = cols[codeIdx];
    for (const { col, idx } of yearColumns) {
      const val = Number(cols[idx]);
      if (!Number.isFinite(val)) continue;
      let yearMap = byYear.get(col);
      if (!yearMap) {
        yearMap = new Map();
        byYear.set(col, yearMap);
      }
      yearMap.set(code, (yearMap.get(code) ?? 0) + val);
    }
  }

  const years = yearColumns.map(({ col }) => col);
  return { years, byYear };
}

/**
 * Attach population data to region features. If no data is present, population = null and hasPopulationData = false.
 */
export function augmentFeaturesWithPopulation(
  features: Feature<Geometry, RegionProperties>[],
  populationByCode: Map<string, number>
): Feature<Geometry, RegionProperties>[] {
  return features.map((f) => {
    const code = f.properties?.LAD23CD;
    const population = code ? populationByCode.get(code) ?? null : null;
    const areaSqKm = f.properties?.areaSqKm ?? null;
    const density =
      population !== null && areaSqKm !== null && areaSqKm > 0
        ? population / areaSqKm
        : null;
    return {
      ...f,
      properties: {
        ...f.properties,
        population,
        density,
        hasPopulationData: population !== null
      }
    };
  });
}

/**
 * Build a quantile-like color scale for values (population density). No-data returns a gray fill.
 */
export function createPopulationColorScale(valuesInput: Array<number | null | undefined>) {
  const values = valuesInput.filter((v): v is number => Number.isFinite(v as number)).sort((a, b) => a - b);
  const colors: [number, number, number, number][] = [
    [247, 251, 255, 200],
    [222, 235, 247, 205],
    [198, 219, 239, 210],
    [158, 202, 225, 215],
    [107, 174, 214, 220],
    [66, 146, 198, 225],
    [33, 113, 181, 230],
    [8, 81, 156, 235],
    [8, 48, 107, 240],
    [3, 19, 43, 245]
  ];
  const noDataColor: [number, number, number, number] = [180, 180, 180, 120];

  const thresholds: number[] = [];
  const bucketCount = colors.length;
  if (values.length > 0) {
    for (let i = 1; i < bucketCount; i++) {
      const idx = Math.min(values.length - 1, Math.floor((i * values.length) / bucketCount));
      thresholds.push(values[idx]);
    }
  }

  return (population: number | null) => {
    if (population === null || !Number.isFinite(population)) return noDataColor;
    let bucket = 0;
    while (bucket < thresholds.length && population > thresholds[bucket]) {
      bucket++;
    }
    return colors[Math.min(bucket, colors.length - 1)];
  };
}

/**
 * Get the last (latest) year column from the CSV header.
 */
export function getLastYearFromCsv(csvText: string): string | null {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return null;
  const header = lines[0].replace(/"/g, '').split(',');
  // years start after AGE_GROUP column (index 5)
  const yearStrings = header.slice(5).filter((h) => /^\d{4}$/.test(h));
  if (!yearStrings.length) return null;
  return yearStrings[yearStrings.length - 1];
}

