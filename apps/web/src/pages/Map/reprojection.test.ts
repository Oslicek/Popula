import { describe, it, expect } from 'vitest';
import type { FeatureCollection, Geometry } from 'geojson';
import type { RegionProperties } from './types';
import { reprojectFeatureCollection27700ToWgs84 } from './reprojection';

const sampleMultiPolygon: FeatureCollection<Geometry, RegionProperties> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { LAD23NM: 'Sample District' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [449812.8663, 525823.7191],
              [449912.8663, 525823.7191],
              [449912.8663, 525923.7191],
              [449812.8663, 525923.7191],
              [449812.8663, 525823.7191]
            ]
          ]
        ]
      }
    }
  ]
};

describe('reprojectFeatureCollection27700ToWgs84', () => {
  it('reprojects British National Grid coords to WGS84 lon/lat', () => {
    const result = reprojectFeatureCollection27700ToWgs84(sampleMultiPolygon);
    const coords = (result.features[0].geometry as any).coordinates[0][0] as [number, number][];

    // first vertex should be roughly around North East England
    expect(coords[0][0]).toBeCloseTo(-1.23, 3); // lon
    expect(coords[0][1]).toBeCloseTo(54.6251, 3); // lat

    // polygon remains closed after reprojection
    const first = coords[0];
    const last = coords[coords.length - 1];
    expect(last[0]).toBeCloseTo(first[0], 6);
    expect(last[1]).toBeCloseTo(first[1], 6);
  });

  it('preserves feature properties and count', () => {
    const result = reprojectFeatureCollection27700ToWgs84(sampleMultiPolygon);
    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties?.LAD23NM).toBe('Sample District');
  });
});

