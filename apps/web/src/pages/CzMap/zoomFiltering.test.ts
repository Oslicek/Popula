import { describe, it, expect } from 'vitest';
import type { Feature, Polygon } from 'geojson';
import { filterFeaturesByZoom } from './zoomFiltering';
import type { RegionProperties } from '../Map/types';

describe('filterFeaturesByZoom', () => {
  const createFeature = (areaSqKm: number, code: string): Feature<Polygon, RegionProperties> => ({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
    },
    properties: {
      areaSqKm,
      uzemi_kod: code,
      uzemi_txt: `Region ${code}`,
      LAD23CD: code,
      LAD23NM: `Region ${code}`
    }
  });

  it('should return all features when zoom >= 11', () => {
    const features = [
      createFeature(0.1, 'A'),
      createFeature(0.5, 'B'),
      createFeature(2.0, 'C'),
      createFeature(10.0, 'D')
    ];

    const result = filterFeaturesByZoom(features, 11);
    expect(result).toHaveLength(4);
    expect(result.map(f => f.properties?.uzemi_kod)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('should filter aggressively at low zoom levels using percentiles', () => {
    // Create 1000 features with varying sizes
    const features = Array.from({ length: 1000 }, (_, i) => 
      createFeature(Math.random() * 100, `R${i}`)
    );

    const zoom6 = filterFeaturesByZoom(features, 6);
    const zoom8 = filterFeaturesByZoom(features, 8);
    const zoom10 = filterFeaturesByZoom(features, 10);
    const zoom11 = filterFeaturesByZoom(features, 11);

    // At zoom 6, should show only top ~1-2% (10-20 features out of 1000)
    expect(zoom6.length).toBeLessThan(50);
    expect(zoom6.length).toBeGreaterThan(5);

    // At zoom 8, should show ~5-10% (50-100 features)
    expect(zoom8.length).toBeGreaterThan(zoom6.length);
    expect(zoom8.length).toBeLessThan(150);

    // At zoom 10, should show ~30-50% (300-500 features)
    expect(zoom10.length).toBeGreaterThan(zoom8.length);
    expect(zoom10.length).toBeLessThan(600);

    // At zoom 11+, show all
    expect(zoom11.length).toBe(1000);
  });

  it('should only show largest features at very low zoom', () => {
    const features = [
      createFeature(0.1, 'A'),
      createFeature(0.5, 'B'),
      createFeature(1.0, 'C'),
      createFeature(2.0, 'D'),
      createFeature(5.0, 'E'),
      createFeature(10.0, 'F'),
      createFeature(20.0, 'G'),
      createFeature(50.0, 'H')
    ];

    const result = filterFeaturesByZoom(features, 6);
    
    // Should only include the very largest features
    expect(result.length).toBeLessThanOrEqual(2);
    // The largest features should be included
    expect(result.some(f => f.properties?.uzemi_kod === 'H')).toBe(true);
  });

  it('should handle features without areaSqKm property', () => {
    const features = [
      createFeature(1.0, 'A'),
      createFeature(10.0, 'B'),
      { ...createFeature(2.0, 'C'), properties: { ...createFeature(2.0, 'C').properties, areaSqKm: undefined } }
    ];

    const result = filterFeaturesByZoom(features, 9);
    // Features without area should be filtered out at zoom < 11
    expect(result.every(f => f.properties?.areaSqKm !== undefined)).toBe(true);
  });

  it('should return empty array for empty input', () => {
    const result = filterFeaturesByZoom([], 10);
    expect(result).toHaveLength(0);
  });

  it('should show progressively more features as zoom increases', () => {
    const features = Array.from({ length: 100 }, (_, i) => 
      createFeature(i + 1, `R${i}`)
    );

    const zoom5 = filterFeaturesByZoom(features, 5);
    const zoom7 = filterFeaturesByZoom(features, 7);
    const zoom9 = filterFeaturesByZoom(features, 9);
    const zoom11 = filterFeaturesByZoom(features, 11);

    // Strictly increasing with zoom
    expect(zoom5.length).toBeLessThan(zoom7.length);
    expect(zoom7.length).toBeLessThan(zoom9.length);
    expect(zoom9.length).toBeLessThan(zoom11.length);
    expect(zoom11.length).toBe(100);
  });

  it('should handle large datasets efficiently', () => {
    // Simulate a large dataset like the Czech ZSJ (~43,000 features)
    const features = Array.from({ length: 40000 }, (_, i) => 
      createFeature(Math.random() * 50, `R${i}`)
    );

    const start = Date.now();
    const result = filterFeaturesByZoom(features, 7);
    const duration = Date.now() - start;

    // Should complete in reasonable time (< 250ms)
    expect(duration).toBeLessThan(250);
    
    // Should filter down to a manageable number
    expect(result.length).toBeLessThan(2000);
    expect(result.length).toBeGreaterThan(100);
  });
});
