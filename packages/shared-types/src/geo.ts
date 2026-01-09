/**
 * Geospatial data processing types and messages
 */

export type BBox = [west: number, south: number, east: number, north: number];

export interface GeoProcessOptions {
  targetCrs: string;
  simplify?: boolean;
  simplificationTolerance?: number;
  computeAreas?: boolean;
  deduplicateByProperty?: string;
}

export interface GeoProcessRequest {
  xmlContent: string;
  options: GeoProcessOptions;
}

export interface GeoFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: Record<string, any>;
}

export interface GeoFeatureCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

export interface GeoProcessResponse {
  geojson: GeoFeatureCollection;
  metadata: {
    featureCount: number;
    bbox: BBox;
    processingTimeMs: number;
    sourceCrs: string;
    targetCrs: string;
    duplicatesRemoved?: number;
  };
}

export interface GeoProcessError {
  error: string;
  details?: string;
}
