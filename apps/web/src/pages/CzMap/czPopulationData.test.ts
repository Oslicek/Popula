import { describe, it, expect } from 'vitest';
import type { FeatureCollection, Geometry } from 'geojson';
import { parseCzPopulationCsvByYear } from './czPopulationData';
import { augmentFeaturesWithPopulation, precomputePopulationByYear } from '../Map/populationData';
import type { RegionProperties } from '../Map/types';

const sampleCsv = [
  'idhod;hodnota;ukaz_kod;uzemi_cis;uzemi_kod;sldb_rok;sldb_datum;ukaz_txt;uzemi_txt;uzemi_typ',
  '1;100;3162;47;1001;2021;26.03.2021;Pop;Obec A;zs',
  '2;50;3162;47;1001;2021;26.03.2021;Pop;Obec A;zs',
  '3;200;3162;47;1002;2021;26.03.2021;Pop;Obec B;zs',
  '4;120;3162;47;1001;2022;26.03.2021;Pop;Obec A;zs',
  '5;180;3162;47;1002;2022;26.03.2021;Pop;Obec B;zs',
  '6;999;9999;47;1002;2022;26.03.2021;Other;Obec B;zs' // should be ignored (wrong indicator)
].join('\n');

const sampleGeo: FeatureCollection<Geometry, RegionProperties> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { uzemi_kod: '1001', uzemi_txt: 'Obec A', areaSqKm: 2 },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }
    },
    {
      type: 'Feature',
      properties: { uzemi_kod: '1002', uzemi_txt: 'Obec B', areaSqKm: 1 },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }
    }
  ]
};

describe('CZ population CSV parsing', () => {
  it('parses semicolon-delimited census CSV grouped by uzemi_kod and year', () => {
    const result = parseCzPopulationCsvByYear(sampleCsv);
    expect(result.years).toEqual(['2021', '2022']);
    expect(result.byYear.get('2021')?.get('1001')).toBe(150); // 100 + 50
    expect(result.byYear.get('2021')?.get('1002')).toBe(200);
    expect(result.byYear.get('2022')?.get('1001')).toBe(120);
    expect(result.byYear.get('2022')?.get('1002')).toBe(180);
    expect(result.names.get('1001')).toBe('Obec A');
  });

  it('ignores rows with a different indicator code', () => {
    const result = parseCzPopulationCsvByYear(sampleCsv, { indicatorCode: '3162' });
    expect(result.byYear.get('2022')?.get('1002')).toBe(180); // 999 entry ignored
  });
});

describe('CZ choropleth precomputation', () => {
  it('augments features with CZ population using custom code property', () => {
    const parsed = parseCzPopulationCsvByYear(sampleCsv);
    const augmented = augmentFeaturesWithPopulation(sampleGeo.features, parsed.byYear.get('2021') ?? new Map(), {
      codeProp: 'uzemi_kod'
    });

    const a = augmented.find(f => f.properties?.uzemi_kod === '1001')!;
    expect(a.properties?.population).toBe(150);
    expect(a.properties?.density).toBeCloseTo(75); // 150 / 2 km²
    expect(a.properties?.hasPopulationData).toBe(true);
  });

  it('precomputes per-year CZ data with shared color thresholds', () => {
    const parsed = parseCzPopulationCsvByYear(sampleCsv);
    const palette: [number, number, number, number][] = [
      [240, 248, 255, 200],
      [92, 150, 198, 223],
      [30, 85, 153, 237],
      [5, 30, 90, 246]
    ];
    const { perYearFeatures } = precomputePopulationByYear(sampleGeo.features, parsed.byYear, palette, {
      codeProp: 'uzemi_kod',
      colorProp: 'color'
    });
    const year2022 = perYearFeatures.get('2022')!;
    const b2022 = year2022.find(f => f.properties?.uzemi_kod === '1002')!;
    expect((b2022.properties as any).color).toBeDefined();
    expect(Array.isArray((b2022.properties as any).color)).toBe(true);
  });
});
