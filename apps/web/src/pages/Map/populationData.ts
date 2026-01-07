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
 * Precompute population, density, and colors per year for fast switching.
 */
export function precomputePopulationByYear(
  features: Feature<Geometry, RegionProperties>[],
  populationByYear: Map<string, Map<string, number>>,
  colorsPalette: [number, number, number, number][]
): {
  perYearFeatures: Map<string, Feature<Geometry, RegionProperties>[]>;
  thresholds: Map<string, number[]>;
} {
  const perYearFeatures = new Map<string, Feature<Geometry, RegionProperties>[]>();
  const thresholdsMap = new Map<string, number[]>();

  for (const [year, popMap] of populationByYear.entries()) {
    const augmented = augmentFeaturesWithPopulation(features, popMap);
    const densities = augmented.map((f) => f.properties?.density ?? null);
    const scale = createPopulationColorScale(densities, colorsPalette);

    const colorsUsed = new Set<string>();
    const thresholds: number[] = [];
    if (densities.length) {
      const values = densities.filter((v): v is number => Number.isFinite(v as number)).sort((a, b) => a - b);
      const bucketCount = colorsPalette.length;
      for (let i = 1; i < bucketCount; i++) {
        const idx = Math.min(values.length - 1, Math.floor((i * values.length) / bucketCount));
        thresholds.push(values[idx]);
      }
    }
    thresholdsMap.set(year, thresholds);

    const withColors = augmented.map((f) => {
      const density = f.properties?.density ?? null;
      const color = scale(density);
      colorsUsed.add(color.join(','));
      return {
        ...f,
        properties: {
          ...f.properties,
          color
        }
      };
    });

    perYearFeatures.set(year, withColors);

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/077d060f-f64b-4665-8ffb-d4911617c6a2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix3',
        hypothesisId: 'H_precompute',
        location: 'populationData.ts:precomputePopulationByYear',
        message: 'Precomputed year data',
        data: {
          year,
          thresholds,
          colorsUsed: Array.from(colorsUsed),
          featureCount: withColors.length
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
  }

  return { perYearFeatures, thresholds: thresholdsMap };
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
export function createPopulationColorScale(valuesInput: Array<number | null | undefined>, paletteOverride?: [number, number, number, number][]) {
  const values = valuesInput.filter((v): v is number => Number.isFinite(v as number)).sort((a, b) => a - b);
  const colors: [number, number, number, number][] = paletteOverride ?? [
    [255, 255, 255, 200],
    [240, 248, 255, 200],
    [222, 235, 247, 205],
    [200, 221, 240, 205],
    [188, 210, 232, 210],
    [173, 200, 227, 212],
    [158, 190, 220, 214],
    [140, 180, 214, 216],
    [123, 169, 208, 218],
    [107, 160, 203, 220],
    [92, 150, 198, 223],
    [78, 140, 192, 226],
    [64, 130, 186, 229],
    [50, 115, 177, 232],
    [40, 100, 165, 234],
    [30, 85, 153, 237],
    [22, 70, 142, 240],
    [15, 58, 125, 242],
    [10, 45, 108, 244],
    [5, 30, 90, 246]
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

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/077d060f-f64b-4665-8ffb-d4911617c6a2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'pre-fix1',
      hypothesisId: 'H_thresholds',
      location: 'populationData.ts:createPopulationColorScale',
      message: 'Computed thresholds and colors',
      data: { valuesCount: values.length, min: values[0] ?? null, max: values[values.length - 1] ?? null, thresholds, bucketCount },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion

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

