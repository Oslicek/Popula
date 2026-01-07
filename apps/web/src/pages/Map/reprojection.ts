import proj4 from 'proj4';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { RegionProperties } from './types';

// British National Grid (EPSG:27700) to WGS84 definition
const EPSG_27700 = 'EPSG:27700';
const EPSG_27700_DEF =
  '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs';

proj4.defs(EPSG_27700, EPSG_27700_DEF);

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
  const newGeom: Geometry = {
    ...feature.geometry,
    coordinates: reprojectCoordinates((feature.geometry as any).coordinates)
  } as Geometry;
  return {
    ...feature,
    geometry: newGeom
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

