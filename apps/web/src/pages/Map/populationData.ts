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
    [237, 248, 251, 200],
    [191, 211, 230, 220],
    [158, 188, 218, 230],
    [117, 107, 177, 235],
    [84, 39, 143, 240]
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

