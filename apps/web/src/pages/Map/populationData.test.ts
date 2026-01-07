import { describe, it, expect } from 'vitest';
import type { FeatureCollection, Geometry } from 'geojson';
import {
  parsePopulationCsv,
  augmentFeaturesWithPopulation,
  createPopulationColorScale,
  getLastYearFromCsv,
  parsePopulationCsvByYear,
  precomputePopulationByYear
} from './populationData';
import type { RegionProperties } from './types';

const sampleCsv = [
  '"AREA_CODE","AREA_NAME","COMPONENT","SEX","AGE_GROUP","2022","2023"',
  'E06000001,County A,Population,persons,0,100,110',
  'E06000001,County A,Population,persons,1,120,130',
  'E06000002,County B,Population,persons,0,200,210'
].join('\n');

const sampleGeo: FeatureCollection<Geometry, RegionProperties> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { LAD23CD: 'E06000001', LAD23NM: 'County A', areaSqKm: 0.5 },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }
    },
    {
      type: 'Feature',
      properties: { LAD23CD: 'E06000002', LAD23NM: 'County B', areaSqKm: 1 },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }
    },
    {
      type: 'Feature',
      properties: { LAD23CD: 'S12000045', LAD23NM: 'County C (no data)', areaSqKm: 0.8 },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }
    }
  ]
};

describe('populationData helpers', () => {
  it('parses CSV and aggregates population by area code for a given year', () => {
    const map = parsePopulationCsv(sampleCsv, '2022');
    expect(map.get('E06000001')).toBe(220); // 100 + 120 for ages 0 and 1
    expect(map.get('E06000002')).toBe(200);
  });

  it('augments geo features with population and hasPopulationData flags', () => {
    const popMap = parsePopulationCsv(sampleCsv, '2022');
    const augmented = augmentFeaturesWithPopulation(sampleGeo.features, popMap);
    const withData = augmented.find(f => f.properties?.LAD23CD === 'E06000001')!;
    const noData = augmented.find(f => f.properties?.LAD23CD === 'S12000045')!;

    expect(withData.properties?.population).toBe(220);
    expect(withData.properties?.hasPopulationData).toBe(true);
    expect(withData.properties?.density).toBeCloseTo(440); // 220 / 0.5
    expect(noData.properties?.population).toBe(null);
    expect(noData.properties?.hasPopulationData).toBe(false);
    expect(noData.properties?.density).toBe(null);
  });

  it('creates a color scale that returns data colors and a no-data color', () => {
    const popMap = parsePopulationCsv(sampleCsv, '2022');
    const densities = augmentFeaturesWithPopulation(sampleGeo.features, popMap).map((f) => f.properties?.density ?? null);
    const colorScale = createPopulationColorScale(densities);
    const dataColor = colorScale(440);
    const noDataColor = colorScale(null);

    expect(dataColor).toHaveLength(4);
    expect(noDataColor).toEqual([180, 180, 180, 120]);
  });

  it('extracts the latest year from the CSV header', () => {
    const year = getLastYearFromCsv(sampleCsv);
    expect(year).toBe('2023');
  });

  it('parses all years and aggregates per year', () => {
    const { years, byYear } = parsePopulationCsvByYear(sampleCsv);
    expect(years).toEqual(['2022', '2023']);
    expect(byYear.get('2022')?.get('E06000001')).toBe(220);
    expect(byYear.get('2023')?.get('E06000002')).toBe(210);
  });

  it('precomputes per-year augmented features with densities and colors', () => {
    const { byYear } = parsePopulationCsvByYear(sampleCsv);
    const palette: [number, number, number, number][] = [
      [255, 255, 255, 200],
      [100, 150, 200, 220],
      [20, 50, 100, 240]
    ];
    const result = precomputePopulationByYear(sampleGeo.features, byYear, palette);

    expect(Array.from(result.perYearFeatures.keys())).toEqual(['2022', '2023']);

    const year2022 = result.perYearFeatures.get('2022')!;
    const a2022 = year2022.find(f => f.properties?.LAD23CD === 'E06000001')!;
    const b2022 = year2022.find(f => f.properties?.LAD23CD === 'E06000002')!;
    const c2022 = year2022.find(f => f.properties?.LAD23CD === 'S12000045')!;

    expect(a2022.properties?.density).toBeCloseTo(440); // 220 / 0.5
    expect(b2022.properties?.density).toBeCloseTo(200); // 200 / 1
    expect(c2022.properties?.density).toBe(null);
    expect(Array.isArray((a2022.properties as any).color)).toBe(true);
    expect((c2022.properties as any).color).toEqual([180, 180, 180, 120]); // no data fallback

    const year2023 = result.perYearFeatures.get('2023')!;
    const a2023 = year2023.find(f => f.properties?.LAD23CD === 'E06000001')!;
    expect(a2023.properties?.population).toBe(240); // 110 + 130
  });
});

