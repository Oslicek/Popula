import { describe, it, expect } from 'vitest';
import proj4 from 'proj4';
import type { FeatureCollection, Geometry } from 'geojson';
import type { RegionProperties } from '../Map/types';
import { reprojectFeatureCollection5514ToWgs84 } from './reprojectionCz';

describe('reprojectFeatureCollection5514ToWgs84', () => {
  it('round-trips coordinates from EPSG:5514 to WGS84', () => {
    const pragueWgs: [number, number] = [14.42076, 50.08804];
    const prague5514 = proj4('EPSG:4326', 'EPSG:5514', pragueWgs);
    const [x, y] = prague5514 as [number, number];

    const fc: FeatureCollection<Geometry, RegionProperties> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { uzemi_kod: 'PRA' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [x, y],
                [x + 100, y],
                [x + 100, y + 100],
                [x, y + 100],
                [x, y]
              ]
            ]
          }
        }
      ]
    };

    const result = reprojectFeatureCollection5514ToWgs84(fc);
    const coords = (result.features[0].geometry as any).coordinates[0][0] as [number, number];

    expect(coords[0]).toBeCloseTo(pragueWgs[0], 3);
    expect(coords[1]).toBeCloseTo(pragueWgs[1], 3);

    const area = result.features[0].properties?.areaSqKm as number;
    expect(area).toBeGreaterThan(0.009);
    expect(area).toBeLessThan(0.011);
  });
});
