import type { RegionProperties } from '../Map/types';
import type { Feature, Geometry } from 'geojson';
import { augmentFeaturesWithPopulation, precomputePopulationByYear } from '../Map/populationData';

export const DEFAULT_CZ_INDICATOR = '3162'; // Počet obyvatel s obvyklým pobytem

type ParseOptions = {
  indicatorCode?: string | null;
  delimiter?: string;
};

export function parseCzPopulationCsvByYear(
  csvText: string,
  options: ParseOptions = {}
): { years: string[]; byYear: Map<string, Map<string, number>>; names: Map<string, string> } {
  const delimiter = options.delimiter ?? ';';
  const indicatorCode = options.indicatorCode ?? DEFAULT_CZ_INDICATOR;

  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { years: [], byYear: new Map(), names: new Map() };

  const clean = (value: string) => value.replace(/"/g, '').trim();
  const header = lines[0].split(delimiter).map(clean);

  const codeIdx = header.indexOf('uzemi_kod');
  const valueIdx = header.indexOf('hodnota');
  const yearIdx = header.indexOf('sldb_rok');
  const indicatorIdx = header.indexOf('ukaz_kod');
  const nameIdx = header.indexOf('uzemi_txt');

  if (codeIdx === -1 || valueIdx === -1 || yearIdx === -1) {
    return { years: [], byYear: new Map(), names: new Map() };
  }

  const byYear = new Map<string, Map<string, number>>();
  const names = new Map<string, string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(clean);
    if (cols.length <= Math.max(codeIdx, valueIdx, yearIdx)) continue;

    const indicator = indicatorIdx >= 0 ? cols[indicatorIdx] : null;
    if (indicatorCode && indicator && indicator !== indicatorCode) continue;

    const code = cols[codeIdx];
    const year = cols[yearIdx];
    const val = Number(cols[valueIdx]);
    if (!code || !year || !Number.isFinite(val)) continue;

    const existingYear = byYear.get(year) ?? new Map<string, number>();
    existingYear.set(code, (existingYear.get(code) ?? 0) + val);
    byYear.set(year, existingYear);

    if (nameIdx >= 0 && cols[nameIdx]) {
      names.set(code, cols[nameIdx]);
    }
  }

  const years = Array.from(byYear.keys()).sort();
  return { years, byYear, names };
}

export function augmentCzFeatures(
  features: Feature<Geometry, RegionProperties>[],
  populationByCode: Map<string, number>
) {
  return augmentFeaturesWithPopulation(features, populationByCode, { codeProp: 'uzemi_kod' });
}

export function precomputeCzPopulationByYear(
  features: Feature<Geometry, RegionProperties>[],
  populationByYear: Map<string, Map<string, number>>,
  colorsPalette: [number, number, number, number][]
) {
  return precomputePopulationByYear(features, populationByYear, colorsPalette, {
    codeProp: 'uzemi_kod',
    colorProp: 'color'
  });
}
