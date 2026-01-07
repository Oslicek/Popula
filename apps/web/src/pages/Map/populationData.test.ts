import { describe, it, expect } from 'vitest';
import type { FeatureCollection, Geometry } from 'geojson';
import { parsePopulationCsv, augmentFeaturesWithPopulation, createPopulationColorScale, getLastYearFromCsv } from './populationData';
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
      properties: { LAD23CD: 'E06000001', LAD23NM: 'County A' },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }
    },
    {
      type: 'Feature',
      properties: { LAD23CD: 'S12000045', LAD23NM: 'County C (no data)' },
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
    expect(noData.properties?.population).toBe(null);
    expect(noData.properties?.hasPopulationData).toBe(false);
  });

  it('creates a color scale that returns data colors and a no-data color', () => {
    const popMap = parsePopulationCsv(sampleCsv, '2022');
    const colorScale = createPopulationColorScale(popMap);
    const dataColor = colorScale(220);
    const noDataColor = colorScale(null);

    expect(dataColor).toHaveLength(4);
    expect(noDataColor).toEqual([180, 180, 180, 120]);
  });

  it('extracts the latest year from the CSV header', () => {
    const year = getLastYearFromCsv(sampleCsv);
    expect(year).toBe('2023');
  });
});

