import { describe, it, expect } from 'vitest';
import type { Feature, Polygon } from 'geojson';
import { filterFeaturesByViewport, type BBox } from './viewportFiltering';
import type { RegionProperties } from '../Map/types';

describe('filterFeaturesByViewport', () => {
  const createFeature = (coords: [number, number][][], code: string): Feature<Polygon, RegionProperties> => ({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: coords
    },
    properties: {
      uzemi_kod: code,
      uzemi_txt: `Region ${code}`,
      LAD23CD: code,
      LAD23NM: `Region ${code}`
    }
  });

  it('should return all features at low zoom levels (< 9)', () => {
    const viewport: BBox = { west: 10, south: 40, east: 20, north: 50 };
    
    const features = [
      createFeature([[[12, 42], [13, 42], [13, 43], [12, 43], [12, 42]]], 'A'), // Inside
      createFeature([[[30, 60], [31, 60], [31, 61], [30, 61], [30, 60]]], 'B'), // Outside
    ];

    const result = filterFeaturesByViewport(features, viewport, 8);
    
    // At zoom < 9, all features should pass through
    expect(result).toHaveLength(2);
  });

  it('should filter by viewport at high zoom levels (>= 9)', () => {
    const viewport: BBox = { west: 10, south: 40, east: 20, north: 50 };
    
    const features = [
      createFeature([[[12, 42], [13, 42], [13, 43], [12, 43], [12, 42]]], 'A'), // Inside
      createFeature([[[14, 44], [15, 44], [15, 45], [14, 45], [14, 44]]], 'B'), // Inside
      createFeature([[[30, 60], [31, 60], [31, 61], [30, 61], [30, 60]]], 'C'), // Outside
      createFeature([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]], 'D'), // Outside
    ];

    const result = filterFeaturesByViewport(features, viewport, 10);
    
    // At zoom >= 9, only features inside or near viewport should be included
    expect(result.length).toBeLessThan(features.length);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.map(f => f.properties?.uzemi_kod)).toContain('A');
    expect(result.map(f => f.properties?.uzemi_kod)).toContain('B');
  });

  it('should include features that partially intersect viewport', () => {
    const viewport: BBox = { west: 10, south: 40, east: 20, north: 50 };
    
    const features = [
      // Feature partially overlapping from the left
      createFeature([[[8, 42], [12, 42], [12, 43], [8, 43], [8, 42]]], 'A'),
      // Feature partially overlapping from the right
      createFeature([[[18, 44], [22, 44], [22, 45], [18, 45], [18, 44]]], 'B'),
    ];

    const result = filterFeaturesByViewport(features, viewport, 10);
    
    // Both should be included due to viewport buffer
    expect(result).toHaveLength(2);
  });

  it('should handle empty input', () => {
    const viewport: BBox = { west: 10, south: 40, east: 20, north: 50 };
    const result = filterFeaturesByViewport([], viewport, 10);
    expect(result).toHaveLength(0);
  });

  it('should handle multipolygon geometries', () => {
    const viewport: BBox = { west: 10, south: 40, east: 20, north: 50 };
    
    const multiFeature: Feature<any, RegionProperties> = {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [[[12, 42], [13, 42], [13, 43], [12, 43], [12, 42]]], // Inside
          [[[30, 60], [31, 60], [31, 61], [30, 61], [30, 60]]] // Outside
        ]
      },
      properties: {
        uzemi_kod: 'MP1',
        uzemi_txt: 'MultiPolygon 1',
        LAD23CD: 'MP1',
        LAD23NM: 'MultiPolygon 1'
      }
    };

    const result = filterFeaturesByViewport([multiFeature], viewport, 10);
    
    // Should include the multipolygon if any part is in viewport
    expect(result).toHaveLength(1);
  });

  it('should be performant with large datasets', () => {
    const viewport: BBox = { west: 14, south: 42, east: 16, north: 44 };
    
    // Create 5,000 features spread across a large area (lng 10-20, lat 40-45)
    const features = Array.from({ length: 5000 }, (_, i) => {
      const baseLng = 10 + (i % 100) * 0.1;
      const baseLat = 40 + Math.floor(i / 100) * 0.1;
      return createFeature([
        [[baseLng, baseLat], [baseLng + 0.05, baseLat], [baseLng + 0.05, baseLat + 0.05], [baseLng, baseLat + 0.05], [baseLng, baseLat]]
      ], `R${i}`);
    });

    const start = performance.now();
    const result = filterFeaturesByViewport(features, viewport, 10);
    const duration = performance.now() - start;

    // Should complete quickly (< 20ms for 5000 features)
    expect(duration).toBeLessThan(20);
    
    // Should significantly reduce the feature count (from 5000 to ~600-700 based on viewport)
    expect(result.length).toBeLessThan(1000);
    expect(result.length).toBeGreaterThan(100);
  });

  it('should include features near viewport boundaries with buffer', () => {
    const viewport: BBox = { west: 10, south: 40, east: 20, north: 50 };
    // Viewport width = 10, so buffer = 1 (10% of width)
    
    const features = [
      // Feature just outside west boundary (within buffer)
      createFeature([[[9.5, 42], [9.8, 42], [9.8, 43], [9.5, 43], [9.5, 42]]], 'A'),
      // Feature way outside (beyond buffer)
      createFeature([[[0, 42], [1, 42], [1, 43], [0, 43], [0, 42]]], 'B'),
    ];

    const result = filterFeaturesByViewport(features, viewport, 10);
    
    // Feature A should be included due to buffer, B should not
    expect(result.length).toBe(1);
    expect(result[0].properties?.uzemi_kod).toBe('A');
  });
});
