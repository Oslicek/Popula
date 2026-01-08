import type { Feature, Geometry } from 'geojson';
import type { RegionProperties } from '../Map/types';

export type BBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

/**
 * Get a simple bounding box for a geometry.
 * Uses a fast approximation - checks first coordinate of each ring/linestring.
 */
function getGeometryBBoxFast(geometry: Geometry): BBox | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let hasCoords = false;

  const processCoord = (lng: number, lat: number) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    hasCoords = true;
  };

  try {
    if (geometry.type === 'Polygon') {
      // Check all rings
      for (const ring of geometry.coordinates) {
        if (ring.length > 0) {
          processCoord(ring[0][0], ring[0][1]);
          // Also check a few more points for better bbox
          const mid = Math.floor(ring.length / 2);
          if (mid > 0) processCoord(ring[mid][0], ring[mid][1]);
          if (ring.length > 2) processCoord(ring[ring.length - 1][0], ring[ring.length - 1][1]);
        }
      }
    } else if (geometry.type === 'MultiPolygon') {
      // Check first point of each polygon
      for (const polygon of geometry.coordinates) {
        for (const ring of polygon) {
          if (ring.length > 0) {
            processCoord(ring[0][0], ring[0][1]);
          }
        }
      }
    }
  } catch (e) {
    return null;
  }

  if (!hasCoords) return null;

  return { west: minLng, south: minLat, east: maxLng, north: maxLat };
}

/**
 * Check if two bounding boxes intersect
 */
function bboxIntersects(bbox1: BBox, bbox2: BBox): boolean {
  return !(
    bbox1.east < bbox2.west ||
    bbox1.west > bbox2.east ||
    bbox1.north < bbox2.south ||
    bbox1.south > bbox2.north
  );
}

/**
 * Filter features to only those visible in the current viewport.
 * This is a JavaScript-side optimization that significantly improves performance
 * at high zoom levels by reducing the number of features deck.gl needs to process.
 *
 * Note: deck.gl does GPU-side viewport culling, but it still processes all geometries
 * on the CPU first (tessellation, coordinate transformation). This filter reduces
 * that CPU overhead.
 *
 * @param features - Array of GeoJSON features
 * @param viewportBBox - Current map viewport bounding box
 * @param zoom - Current zoom level (viewport filtering only applied at zoom >= 9)
 * @returns Filtered array of features within or near the viewport
 */
export function filterFeaturesByViewport(
  features: Feature<Geometry, RegionProperties>[],
  viewportBBox: BBox,
  zoom: number
): Feature<Geometry, RegionProperties>[] {
  // Only apply viewport filtering at higher zoom levels where we have many features
  if (zoom < 9) {
    return features;
  }

  // Expand viewport slightly to include features that might be partially visible
  const buffer = (viewportBBox.east - viewportBBox.west) * 0.1;
  const expandedViewport: BBox = {
    west: viewportBBox.west - buffer,
    south: viewportBBox.south - buffer,
    east: viewportBBox.east + buffer,
    north: viewportBBox.north + buffer
  };

  const start = performance.now();
  const filtered = features.filter(feature => {
    const geomBBox = getGeometryBBoxFast(feature.geometry);
    if (!geomBBox) return false;
    return bboxIntersects(geomBBox, expandedViewport);
  });
  const duration = performance.now() - start;

  if (duration > 10) {
    console.warn(`[viewportFiltering] Slow filtering: ${duration.toFixed(1)}ms for ${features.length} features`);
  }

  return filtered;
}
