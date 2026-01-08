import type { Feature, Geometry } from 'geojson';
import type { RegionProperties } from '../Map/types';

/**
 * Filters features based on zoom level to improve rendering performance.
 * Uses a percentile-based approach: at low zoom levels, only the largest
 * regions (by area) are shown. As zoom increases, progressively more features
 * are revealed.
 *
 * This approach is adaptive and works regardless of the actual distribution
 * of region sizes in the dataset.
 *
 * @param features - Array of GeoJSON features to filter
 * @param zoom - Current map zoom level
 * @returns Filtered array of features appropriate for the zoom level
 */
// Cache for sorted features to avoid re-sorting on every zoom change
let cachedFeatures: Feature<Geometry, RegionProperties>[] | null = null;
let cachedSorted: Feature<Geometry, RegionProperties>[] | null = null;

export function filterFeaturesByZoom(
  features: Feature<Geometry, RegionProperties>[],
  zoom: number
): Feature<Geometry, RegionProperties>[] {
  // At high zoom levels, show all features
  if (zoom >= 11) {
    return features;
  }

  // Check if we need to re-sort (features changed)
  if (cachedFeatures !== features) {
    // Filter out features without area data and sort by area descending
    const featuresWithArea = features.filter(f => {
      const area = f.properties?.areaSqKm;
      return area !== undefined && area !== null && area > 0;
    });

    if (featuresWithArea.length === 0) {
      cachedFeatures = features;
      cachedSorted = [];
      return [];
    }

    // Sort once and cache
    cachedSorted = [...featuresWithArea].sort((a, b) => {
      const areaA = a.properties?.areaSqKm ?? 0;
      const areaB = b.properties?.areaSqKm ?? 0;
      return areaB - areaA; // Descending order
    });
    cachedFeatures = features;
  }

  if (!cachedSorted || cachedSorted.length === 0) {
    return [];
  }

  // Determine what percentage of features to show based on zoom level
  let percentile: number;
  
  if (zoom >= 10) {
    percentile = 0.50; // Top 50%
  } else if (zoom >= 9) {
    percentile = 0.20; // Top 20%
  } else if (zoom >= 8) {
    percentile = 0.08; // Top 8%
  } else if (zoom >= 7) {
    percentile = 0.03; // Top 3%
  } else if (zoom >= 6) {
    percentile = 0.01; // Top 1%
  } else {
    percentile = 0.005; // Top 0.5%
  }

  // Calculate how many features to show and slice from cached sorted array
  const targetCount = Math.max(1, Math.floor(cachedSorted.length * percentile));
  return cachedSorted.slice(0, targetCount);
}
