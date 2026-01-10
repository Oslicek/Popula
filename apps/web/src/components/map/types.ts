/**
 * Shared Map Types
 * 
 * Types shared between UK and CZ map implementations
 */

import type { Feature, Geometry } from 'geojson';

export interface RegionProperties {
  // UK properties
  LAD23CD?: string;
  LAD23NM?: string;
  LAD23NMW?: string;
  BNG_E?: number;
  BNG_N?: number;
  LONG?: number;
  LAT?: number;
  GlobalID?: string;
  
  // CZ properties
  uzemi_kod?: string;
  uzemi_txt?: string;
  
  // Computed properties
  areaSqKm?: number | null;
  population?: number | null;
  density?: number | null;
  hasPopulationData?: boolean;
  color?: [number, number, number, number];
  
  [key: string]: unknown;
}

export type RegionFeature = Feature<Geometry, RegionProperties>;

export interface HoverInfo {
  name: string;
  population: number | null;
  density: number | null;
  areaSqKm: number | null;
}

export interface MapViewState {
  lng: number;
  lat: number;
  zoom: number;
}

export interface MapRegion {
  id: 'uk' | 'cz';
  name: string;
  center: [number, number];
  zoom: number;
  geojsonUrl: string;
  populationCsvUrl: string;
}

export const MAP_REGIONS: MapRegion[] = [
  {
    id: 'uk',
    name: 'United Kingdom',
    center: [-2.5, 54.5],
    zoom: 5.5,
    geojsonUrl: '/sample-data/uk-local-authorities.geojson',
    populationCsvUrl: '/sample-data/2022 SNPP Population persons.csv',
  },
  {
    id: 'cz',
    name: 'Czech Republic',
    center: [15.3, 49.8],
    zoom: 6,
    geojsonUrl: '/sample-data/cz-zsj.geojson',
    populationCsvUrl: '/sample-data/sldb2021_obyv_byt_zsj.csv',
  },
];
