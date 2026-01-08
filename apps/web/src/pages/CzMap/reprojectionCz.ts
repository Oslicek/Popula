import proj4 from 'proj4';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { RegionProperties } from '../Map/types';

const EPSG_5514 = 'EPSG:5514';
const EPSG_5514_DEF =
  '+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 +k=0.9999 +x_0=0 +y_0=0 +a=6377397.155 +b=6356078.963 +towgs84=570.69,85.69,462.84,4.99821,1.58676,5.2611,3.56 +units=m +no_defs';

proj4.defs(EPSG_5514, EPSG_5514_DEF);

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
  let area = ringAreaSqMeters(poly[0]);
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
    const [lon, lat] = proj4(EPSG_5514, proj4.WGS84, [x, y]);
    return [lon, lat];
  }
  return (coords as any[]).map(reprojectCoordinates);
};

export function reprojectFeature5514ToWgs84(
  feature: Feature<Geometry, RegionProperties>
): Feature<Geometry, RegionProperties> {
  if (!feature.geometry) return feature;

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

export function reprojectFeatureCollection5514ToWgs84(
  fc: FeatureCollection<Geometry, RegionProperties>
): FeatureCollection<Geometry, RegionProperties> {
  return {
    ...fc,
    features: fc.features.map(reprojectFeature5514ToWgs84)
  };
}
