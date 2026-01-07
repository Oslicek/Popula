import proj4 from 'proj4';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { RegionProperties } from './types';

// British National Grid (EPSG:27700) to WGS84 definition
const EPSG_27700 = 'EPSG:27700';
const EPSG_27700_DEF =
  '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs';

proj4.defs(EPSG_27700, EPSG_27700_DEF);

const ringAreaSqMeters = (ring: [number, number][]): number => {
  let area = 0;
  const n = ring.length;
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
};

const polygonAreaSqMeters = (poly: [number, number][][]): number => {
  if (!poly.length) return 0;
  let area = 0;
  // first ring outer, rest holes
  area += ringAreaSqMeters(poly[0]);
  for (let i = 1; i < poly.length; i++) {
    area -= Math.abs(ringAreaSqMeters(poly[i]));
  }
  return area;
};

const multipolygonAreaSqMeters = (multi: [number, number][][][]): number => {
  return multi.reduce((sum, poly) => sum + polygonAreaSqMeters(poly), 0);
};

const reprojectCoordinates = (coords: any): any => {
  if (typeof coords[0] === 'number') {
    const [x, y] = coords as [number, number];
    const [lon, lat] = proj4(EPSG_27700, proj4.WGS84, [x, y]);
    return [lon, lat];
  }
  return (coords as any[]).map(reprojectCoordinates);
};

export function reprojectFeature27700ToWgs84(
  feature: Feature<Geometry, RegionProperties>
): Feature<Geometry, RegionProperties> {
  if (!feature.geometry) return feature;

  // Compute area in projected (meters) before reprojection
  let areaSqKm: number | null = null;
  const g: any = feature.geometry;
  if (g.type === 'Polygon') {
    areaSqKm = Math.abs(polygonAreaSqMeters(g.coordinates)) / 1e6;
  } else if (g.type === 'MultiPolygon') {
    areaSqKm = Math.abs(multipolygonAreaSqMeters(g.coordinates)) / 1e6;
  }

  const newGeom: Geometry = {
    ...feature.geometry,
    coordinates: reprojectCoordinates((feature.geometry as any).coordinates)
  } as Geometry;
  return {
    ...feature,
    geometry: newGeom,
    properties: {
      ...feature.properties,
      areaSqKm
    }
  };
}

export function reprojectFeatureCollection27700ToWgs84(
  fc: FeatureCollection<Geometry, RegionProperties>
): FeatureCollection<Geometry, RegionProperties> {
  return {
    ...fc,
    features: fc.features.map(reprojectFeature27700ToWgs84)
  };
}

