import { describe, it, expect } from 'vitest';
import type { FeatureCollection, Geometry } from 'geojson';
import { parsePopulationCsv, augmentFeaturesWithPopulation, createPopulationColorScale, getLastYearFromCsv, parsePopulationCsvByYear } from './populationData';
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
});

